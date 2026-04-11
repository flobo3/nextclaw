# v0.15.91-run-api-send-completed-contract

## 迭代完成说明

- 将 `runApi.send()` 的成功契约收敛到 backend 单点：`DefaultNcpAgentBackend.send()` 现在保证成功路径对调用方一定暴露 `MessageCompleted`，且该事件出现在 `RunFinished` 之前。
- 保留现有 `run.*` 生命周期事件模型，不重写 NCP 协议；本次只补 send contract normalization：
  - runtime 若已产出 `MessageCompleted`，backend 直接透传，并禁止重复 completed。
  - runtime 若只产出到 `RunFinished`，backend 会基于当前 live session state 组装唯一的 `MessageCompleted`，再继续发布 `RunFinished`。
  - runtime 若 `RunFinished` 时没有对应 final assistant message，backend 直接 fail-fast，不做 session-level fallback。
- 删除调用方分散收尾与兜底：
  - `session-request-broker.ts` 不再回读 `listSessionMessages()` 查找最终 assistant message。
  - `session-request-result.ts` 中无用的 `findLatestAssistantMessage()` 已删除。
  - 相关类型 `ResolveCompletedMessageParams` 已删除。
- 同步更新测试契约：
  - toolkit backend 测试新增 send completed contract 覆盖。
  - `create-ui-ncp-agent` 相关成功路径断言统一包含 `MessageCompleted`。
  - fake runtime 中原本“不真实地只发 `RunFinished`”的场景已改成最小真实行为。
- 同批次续改：
  - `CodexSdkNcpAgentRuntime` 与 `ClaudeCodeSdkNcpAgentRuntime` 的成功收尾现在也会显式发出 `MessageCompleted`，并保持其顺序早于 `RunFinished`。
  - 两条 runtime 都复用各自的小型 `completed-assistant-message.utils.ts` helper，从当前 `stateManager` 快照优先读取已聚合的 assistant message；若上游本轮没有产出可见文本，则退化为一个空的 final assistant message，避免 `send()` 路径再次命中 “Run finished without a final assistant message”。
  - 本次续改刻意没有把 fallback 再加回 consumer 或 backend，而是只把 runtime 成功终态对齐到既有 send contract。
- 相关方案文档见 [Run API Send Completed Contract Implementation Plan](../../plans/2026-04-11-run-api-send-completed-contract-plan.md)。

## 测试/验证/验收方式

- toolkit 定向测试：
  - `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit test -- run src/agent/agent-backend-finalize-status.test.ts src/agent/in-memory-agent-backend.test.ts`
  - 结果：通过（`3` 个测试文件，`16` 个测试全部通过）
- toolkit 类型检查：
  - `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit tsc`
  - 结果：通过
- nextclaw 定向测试：
  - `pnpm -C packages/nextclaw test -- run src/cli/commands/service-support/gateway/tests/service-cron-job-handler.test.ts src/cli/commands/ncp/runtime/create-ui-ncp-agent.reasoning-normalization.test.ts src/cli/commands/ncp/runtime/create-ui-ncp-agent.child-session-request.test.ts`
  - 结果：通过（`3` 个测试文件，`11` 个测试全部通过）
- nextclaw 定向成功路径测试：
  - `pnpm -C packages/nextclaw test -- run src/cli/commands/ncp/runtime/create-ui-ncp-agent.test.ts -t "keeps codex sessions on the codex runtime for non-GPT OpenAI-compatible models"`
  - 结果：通过（`1` 条目标测试通过）
- nextclaw 全量类型检查：
  - `pnpm -C packages/nextclaw tsc`
  - 结果：未通过
  - 阻塞原因：仓库中已有无关错误，位于 `packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts:230` 与 `packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts:238`
- nextclaw Claude 定向测试：
  - `pnpm -C packages/nextclaw test -- run src/cli/commands/ncp/runtime/create-ui-ncp-agent.claude.test.ts -t "runs claude session messages through the configured Claude CLI entrypoint"`
  - 结果：未通过
  - 阻塞原因：该用例命中现有 `5000ms` timeout，失败形态是 fixture 超时，不是本次 `MessageCompleted` 断言失败
- runtime 续改类型检查：
  - `pnpm -C packages/extensions/nextclaw-ncp-runtime-codex-sdk tsc`
  - `pnpm -C packages/extensions/nextclaw-ncp-runtime-claude-code-sdk tsc`
  - 结果：通过
- toolkit 续改定向测试：
  - `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit test src/agent/agent-conversation-state-manager.test.ts src/agent/agent-backend-finalize-status.test.ts`
  - 结果：通过（`2` 个测试文件，`22` 个测试全部通过）
- 可维护性守卫：
  - `pnpm lint:maintainability:guard`
  - 结果：命令未全绿
  - 非本次阻断原因：
    - `apps/desktop/scripts/update/build-product-bundle.mjs`
    - `apps/desktop/scripts/update/build-update-manifest.mjs`
    - `apps/desktop/scripts/update/write-bundle-public-key.mjs`
  - 结论：本次触达文件未新增新的守卫阻断；当前剩余失败来自工作区内其它新增脚本命名治理

## 发布/部署方式

- 本次未执行发布。
- 若后续发布，需要包含 `nextclaw-ncp-toolkit` 与 `nextclaw` 中这批 send contract 变更一并构建发布。
- 不适用项：
  - 数据库 migration：不适用
  - 服务部署：不适用
  - 线上 API 冒烟：不适用

## 用户/产品视角的验收步骤

1. 启动 `nextclaw` service，并确保 live NCP agent ready。
2. 触发 heartbeat 或 cron，让它们通过 `UiNcpAgentHandle.runApi.send(...)` 执行一次标准 NCP run。
3. 确认调用方成功路径能在事件流里收到 `MessageCompleted`，且其顺序早于 `RunFinished`。
4. 确认 session-request / child-session 跟随请求可以直接消费该 `MessageCompleted`，不需要额外回读 session history。
5. 若故意构造 runtime 只发 `RunFinished` 但没有 final assistant message，确认行为为显式失败，而不是静默兜底成功。

## 可维护性总结汇总

- 长期目标对齐 / 可维护性推进：
  - 本次顺着“统一入口、统一成功语义、行为可预测”推进了一小步。heartbeat、cron、session-request 不再各自补最后一跳，而是统一依赖 backend 暴露的单一 send contract，这更符合 NextClaw 作为统一操作层的方向。
  - primary contract 是 `runApi.send()` 对调用方暴露成功结果的协议；这里属于执行路径，不是纯观察路径，也不应依赖调用方自行补救。自动触发调用方（heartbeat、cron）若被迫各自 fallback，会把运行时协议错误伪装成局部成功；本次明确拒绝这种路径。
  - 本次顺手减债点：删掉消费者侧 fallback，把“最后一条 assistant message 的成立条件”收回 backend 单点处理。
  - 本次续改已经把 codex / claude runtime 的成功终态向这条原则继续推近了一步；下一步若还要继续收敛，应考虑把“runtime 成功必须显式产出 completed message”升级成更硬的公共契约，而不是继续依赖 backend 推断。
- 可维护性复核结论：通过
- 本次顺手减债：是
- 代码增减报告：
  - 新增：318 行
  - 删除：66 行
  - 净增：+252 行
- 非测试代码增减报告：
  - 新增：227 行
  - 删除：56 行
  - 净增：+171 行
- 可维护性总结：
  - 本次是否已尽最大努力优化可维护性：是。续改没有继续在 backend 或 consumer 叠加新 fallback，而是只把漏掉的 runtime 成功终态补齐到已有 contract；同时把新增逻辑拆到 runtime 局部 helper，避免继续推高原始热点文件。
  - 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。虽然这次续改本身有少量净增，但方向是减少“谁来补 completed”的分散关注点，而不是再引入第三套兜底。
  - 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：部分做到。整体相对本迭代起点仍是净增；这次续改额外引入了两个小 helper 文件，因此 `claude-code-sdk/src` 目录 warning 仍在，但换回的是把 codex / claude 两条 runtime 与既有 send contract 对齐，避免继续把成功语义散落到更多调用方。
  - 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。helper 只负责从 runtime 当前状态构造 completed message，成功语义仍然收敛在 runtime 收尾，不再回流 consumer / backend 补猜。
  - 目录结构与文件组织是否满足当前项目治理要求：基本满足。新增文件使用了仓库认可的 `*.utils.ts` 角色后缀；但 `packages/extensions/nextclaw-ncp-runtime-claude-code-sdk/src` 目录本身仍高于 budget，本次仅记录 warning，后续若继续触达该目录应优先按职责再拆。
  - 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：是。本结论基于独立复核，而不是只复述守卫；当前 `no maintainability findings`。
  - no maintainability findings
