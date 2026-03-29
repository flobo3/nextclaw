# 迭代完成说明

- 将仓库根的 `release:check` 从“整仓 `build + lint + tsc`”改为“按当前 release batch 自动收敛”。
- 新增 [scripts/check-release-batch.mjs](../../../../scripts/check-release-batch.mjs)：
  - 从 pending changeset 或 `release:version` 后尚未打 tag 的公开包中推导当前发布批次
  - 只对当前批次里的公开包运行校验
  - 按批次内包依赖顺序执行，避免 `@nextclaw/ui -> nextclaw` 这类顺序依赖继续靠历史构建产物碰运气
  - 对缺失 `build`/`lint`/`tsc` 的包显式输出 `skip`，不再隐式静默
- 根脚本调整：
  - `release:check` 改为 `node scripts/check-release-batch.mjs`
  - 新增 `release:check:all`，保留原先整仓 `build + lint + tsc` 能力，作为显式全量校验入口
- 发布文档同步更新，明确：
  - 默认 `release:check` 只校验当前发布批次
  - 若要全仓校验，显式执行 `pnpm release:check:all`
- 这次改动的目标不是给 `nextclaw` 单独加特判，而是从机制层消除“单包发布却全仓跑”的系统性浪费。

# 测试/验证/验收方式

- 机制验证：
  - `pnpm release:check`
  - 当前实际输出已明确显示：`[release:check] batch packages: nextclaw`
- 运行结果：
  - 只执行了 `nextclaw` 的 `build`、`lint`、`tsc`
  - 未再触发整仓 packages/apps/workers 的全量校验
- 既有功能验证沿用上一迭代已通过结果：
  - `pnpm --filter nextclaw test -- --run src/cli/commands/service-capability-hydration.test.ts src/cli/commands/service-gateway-bootstrap.test.ts`
  - `pnpm --filter nextclaw tsc`
  - `pnpm --filter nextclaw build`

# 发布/部署方式

- 机制发布：
  - 提交本次脚本与文档改动
  - 之后继续使用标准入口 `pnpm release:version` / `pnpm release:publish`
- 新行为：
  - 单包或少量包发布时，`pnpm release:publish` 会自动只校验当前 batch
  - 若需要历史全仓门禁，显式执行 `pnpm release:check:all`

# 用户/产品视角的验收步骤

1. 准备一个只包含 `nextclaw` 的 changeset 或已执行过 `release:version` 的单包发布批次。
2. 执行 `pnpm release:check`。
3. 观察输出开头是否为 `batch packages: nextclaw`，且后续只出现 `nextclaw build/lint/tsc`。
4. 确认不再出现整仓各包 `build/lint/tsc` 的长链路输出。
5. 如需全仓校验，手动执行 `pnpm release:check:all`，确认两条路径职责清晰分离。
