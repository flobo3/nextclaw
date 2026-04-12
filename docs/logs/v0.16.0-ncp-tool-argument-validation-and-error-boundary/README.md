# 迭代完成说明

本次迭代聚焦 NCP 工具调用链路的两个通用问题：

- `tool.parameters` 没有被 runtime 作为完整事实源严格执行
- 工具执行异常会被升级成 run 级失败，直接终止整轮对话

本次实际落地了三类改动：

- 在 [`utils.ts`](/Users/peiwang/Projects/nextbot/packages/ncp-packages/nextclaw-ncp-agent-runtime/src/utils.ts) 用 `Ajv` 替换了手写轻量 validator，开始按完整 JSON Schema 语义校验现有 `tool.parameters`
- 在 [`runtime.ts`](/Users/peiwang/Projects/nextbot/packages/ncp-packages/nextclaw-ncp-agent-runtime/src/runtime.ts) 收敛了工具执行错误边界，把 `toolRegistry.execute()` 抛错转成结构化 `tool_execution_failed` tool result，而不是 `RunError`
- 在 [`ncp-asset-tools.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/ncp/runtime/ncp-asset-tools.ts) 补齐了 `asset_put` 的 `oneOf` / `required` / `additionalProperties: false`，并删除了已被 schema 覆盖的重复参数兜底

本次同时补了定向测试：

- [`utils.test.ts`](/Users/peiwang/Projects/nextbot/packages/ncp-packages/nextclaw-ncp-agent-runtime/src/__tests__/utils.test.ts)
- [`in-memory-agent-backend.tool-execution-failure.test.ts`](/Users/peiwang/Projects/nextbot/packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/__tests__/in-memory-agent-backend.tool-execution-failure.test.ts)
- [`ncp-asset-tools.test.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/ncp/runtime/ncp-asset-tools.test.ts)

相关方案文档：

- [ncp-tool-argument-contract-v1.md](/Users/peiwang/Projects/nextbot/docs/rfcs/ncp-tool-argument-contract-v1.md)
- [2026-04-12-ncp-tool-argument-contract-lightweight-plan.md](/Users/peiwang/Projects/nextbot/docs/plans/2026-04-12-ncp-tool-argument-contract-lightweight-plan.md)

# 测试/验证/验收方式

已执行：

- `pnpm install --filter @nextclaw/ncp-agent-runtime`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-agent-runtime test -- src/__tests__/utils.test.ts`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit test -- src/agent/in-memory-agent-backend.test.ts src/agent/__tests__/in-memory-agent-backend.tool-execution-failure.test.ts`
- `pnpm -C packages/nextclaw test -- src/cli/commands/ncp/runtime/ncp-asset-tools.test.ts`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-agent-runtime tsc`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit tsc`
- `pnpm -C packages/nextclaw tsc`
- `pnpm lint:maintainability:guard`

结果说明：

- 上述测试、类型检查和治理守卫均已通过
- `pnpm lint:maintainability:guard` 仍输出仓库历史 warning，但本次新增变更没有再引入新的治理错误
- 本次没有执行全量 workspace 构建，而是按改动影响范围完成 runtime、toolkit、nextclaw 三个受影响包的最小充分验证

# 发布/部署方式

本次无需额外迁移步骤。

- 合入后按常规发布 `@nextclaw/ncp-agent-runtime`、`@nextclaw/ncp-toolkit` 和 `nextclaw` 即可
- 本次没有新增配置项，也没有新增迁移脚本
- 依赖变更只是在 [`package.json`](/Users/peiwang/Projects/nextbot/packages/ncp-packages/nextclaw-ncp-agent-runtime/package.json) 中给 runtime 包补上 `ajv`

# 用户/产品视角的验收步骤

1. 在 NCP 会话里触发一个参数错误的工具调用，例如给 `asset_put` 传 `file_path`
2. 确认模型收到的是结构化 `invalid_tool_arguments`，而不是整轮对话直接失败
3. 触发一个执行阶段会抛异常的工具调用
4. 确认前端或调用方收到的是结构化 `tool_execution_failed`，且对话仍可继续下一轮
5. 再执行一次合法 `asset_put` 调用，确认正常路径没有回归

# 可维护性总结汇总

本次是否已尽最大努力优化可维护性：是。

本次是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。虽然本次存在净增代码，但已经明确拒绝了“新包 + 新合同层 + 双事实源”的过度方案，最终保留的是更贴近现有架构的最小修法。

是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：部分做到。本次非测试代码净增 74 行，主要来自 `Ajv` 接入和统一错误 helper；同时删除了 runtime 内手写 JSON Schema 子集校验逻辑，并把 `asset_put` 中已被 schema 覆盖的基础参数兜底显著收缩。测试文件新增 3 个，但都放到了现有测试边界下，没有继续恶化主目录平铺度。

抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：更清晰。本次没有新增合同层，也没有把 `parameters` 和另一套 schema 双持；`tool.parameters` 继续是唯一事实源，runtime 只负责执行合同和收敛错误边界，工具只保留业务执行职责。

目录结构与文件组织是否满足当前项目治理要求：满足。本次新增测试文件放在 `__tests__` 子目录，没有继续把高频目录往扁平方向推；`packages/ncp-packages/nextclaw-ncp-agent-runtime/src` 目录仍有历史目录预算 warning，但本次已避免新增直接平铺文件，未继续恶化。

若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：已基于独立复核填写。

可维护性复核结论：通过

本次顺手减债：是

代码增减报告：

- 新增：514 行
- 删除：154 行
- 净增：360 行

非测试代码增减报告：

- 新增：228 行
- 删除：154 行
- 净增：74 行

可维护性总结：

- no maintainability findings
- 这次真正收敛的是“事实源漂移”和“工具失败升级成 run fatal”这两笔通用债务，而且没有为此引入第二套合同抽象
- 剩余净增代码已经接近当前最小必要量；后续最值得继续推进的 seam 不是再加抽象，而是批量补齐其它高风险工具的 `parameters`，让 `validateArgs` 进一步退出基础结构校验
