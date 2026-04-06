# 迭代完成说明

- 将发布链路里的库包构建器从 `tsup` 统一迁到 `tsdown`，并保持现有发布产物仍然输出为 `.js` / `.d.ts`，避免破坏既有 `exports` 契约。
- 删除了 7 个散落的 `tsup.config.ts`，把大多数包的构建约定收敛成直接可读的 `package.json` script。
- 将 `@nextclaw/ui`、`apps/platform-console`、`apps/platform-admin`、`apps/landing` 的 `build` 收敛为纯构建语义，不再把 `tsc` 混进 `build`。
- 重构 [`scripts/check-release-batch.mjs`](/Users/tongwenwen/Projects/Peiiii/nextclaw/scripts/check-release-batch.mjs)，把原先膨胀的主脚本拆到 [`scripts/release-check/batch-plan.mjs`](/Users/tongwenwen/Projects/Peiiii/nextclaw/scripts/release-check/batch-plan.mjs)、[`scripts/release-check/task-runner.mjs`](/Users/tongwenwen/Projects/Peiiii/nextclaw/scripts/release-check/task-runner.mjs)、[`scripts/release-check/steps.mjs`](/Users/tongwenwen/Projects/Peiiii/nextclaw/scripts/release-check/steps.mjs)。
- 默认 `release:check` 语义从 `build + lint + tsc` 收敛为发布关键路径的 `build + typecheck`；新增 `release:check:strict` 承接“当前 release batch 也要带 lint”的显式需求。
- 删除独立的 frontend release checker，让 `release:check:frontend` 直接复用 batch-scoped `release:check`，不再维护两套规则。
- 修正 release-check fingerprint 与治理守卫，让生成产物目录 `ui-dist` 不再破坏 checkpoint cache，也不再被新代码治理误判为手写源码。
- 方案文档：[`docs/plans/2026-04-06-minute-scale-release-check-plan.md`](/Users/tongwenwen/Projects/Peiiii/nextclaw/docs/plans/2026-04-06-minute-scale-release-check-plan.md)

# 测试/验证/验收方式

- `pnpm install`
- `pnpm -C packages/nextclaw-runtime build`
- `pnpm -C packages/extensions/nextclaw-engine-plugin-codex-sdk build`
- `pnpm -C packages/extensions/nextclaw-channel-plugin-weixin build`
- `pnpm -C packages/nextclaw-ui build`
- `pnpm -C packages/nextclaw build`
- `node --check scripts/check-release-batch.mjs`
- `node --check scripts/release-check/batch-plan.mjs`
- `node --check scripts/release-check/task-runner.mjs`
- `node --check scripts/release-check/steps.mjs`
- `pnpm lint:maintainability:guard`
- `time pnpm release:check -- --from-latest-checkpoint --reset`
  - 结果：默认 publish gate 冷启动约 `1 分 46 秒`
- `time pnpm release:check -- --from-latest-checkpoint`
  - 结果：同批次 checkpoint 命中后约 `1.1 秒`

# 发布/部署方式

- 本次未执行实际 NPM 发布或部署。
- 后续按 [`docs/workflows/npm-release-process.md`](/Users/tongwenwen/Projects/Peiiii/nextclaw/docs/workflows/npm-release-process.md) 执行。
- 默认发布前校验现在使用 `pnpm release:check`。
- 若需要当前 release batch 带 lint 的更严格门禁，执行 `pnpm release:check:strict`。

# 用户/产品视角的验收步骤

1. 在仓库根执行 `pnpm release:check -- --from-latest-checkpoint --reset`。
2. 确认默认发布校验不再额外跑 batch lint，只执行发布关键路径相关的 `build` 与 `tsc`。
3. 确认输出里能看到独立的 step concurrency 日志，而不是简单粗暴的统一并发。
4. 再执行一次 `pnpm release:check -- --from-latest-checkpoint`。
5. 确认第二次回放几乎全部显示 `cached success`，且总时长降到秒级。

# 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。不是在旧的 `tsup + build/lint/tsc` 结构上继续打补丁，而是直接删掉 `tsup` 配置文件、删掉独立 frontend checker、删掉默认发布链路中的 batch lint、删掉 `build` 里混入的 `tsc`。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：是。当前 diff 统计为：
  - 代码增减报告：
  - 新增：401 行
  - 删除：915 行
  - 净增：-514 行
  - 非测试代码增减报告：
  - 新增：401 行
  - 删除：915 行
  - 净增：-514 行
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：更清晰。`release:check` 的批次规划、步骤解析、任务调度被拆成独立模块；没有新增“万能 release helper”，而是按职责拆成最小必要子模块。
- 目录结构与文件组织是否满足当前项目治理要求：部分满足。`scripts` 顶层目录仍然超过预算，但这次没有继续恶化，反而把文件数从 `63` 降到 `62`，并新增了 `scripts/release-check/` 子目录作为后续继续收敛的入口。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：已基于独立复核填写。
- 可维护性复核结论：通过
- 本次顺手减债：是
- no maintainability findings
- 可维护性总结：这次改动不是把复杂度换个位置，而是实质删掉了旧构建器、旧配置文件、旧前端发布分支和默认发布链路里的非关键检查。总代码净减少 `514` 行，增长没有发生；剩余维护债主要在 `scripts` 顶层目录仍偏平，但这次已经开始向子目录收敛。
