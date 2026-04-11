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
  - `native` 路径中 `OpenAICompatibleProvider` 新增了对 root API base 的候选重试：当自定义 OpenAI-compatible provider 先打根路径返回“空 assistant”时，会继续尝试同域名的 `/v1` 路径，而不是把空响应误当成成功完成。
  - 这次续改直接对齐了 `codex` 当前能跑通的行为差异：`codex` 对 `custom-1/gpt-5.4` 能工作，但 `native` 之前会因为 `https://aigateway.chat` 根路径返回空 assistant 而在 send contract 末端炸成 `HTTP 500`；现在 `native` 已可通过同一 provider 正常返回文本。
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
- core 定向测试：
  - `pnpm -C packages/nextclaw-core test openai_provider.test.ts`
  - 结果：通过（`1` 个测试文件，`8` 个测试全部通过）
- core 类型检查：
  - `pnpm -C packages/nextclaw-core tsc`
  - 结果：通过
- `native + custom-1/gpt-5.4` provider 级直连验证：
  - 使用 `ProviderManager.chatStream(...)` 直接读取 `custom-1/gpt-5.4`
  - 结果：现在会返回 `delta: "OK"` 与最终 `done.response.content: "OK"`，不再是空 assistant
- 完整 NCP HTTP 冒烟：
  - 在单独起的本地服务 `http://127.0.0.1:18893` 上执行 `/api/ncp/agent/stream + /api/ncp/agent/send`
  - metadata：`session_type=native`、`model=custom-1/gpt-5.4`
  - 结果：`HTTP 200`，真实收到 `message.text-delta = "OK"` 与 `message.completed`，不再复现原来的立即 `HTTP 500`
- toolkit 续改定向测试：
  - `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit test src/agent/agent-conversation-state-manager.test.ts src/agent/agent-backend-finalize-status.test.ts`
  - 结果：通过（`2` 个测试文件，`22` 个测试全部通过）
- 可维护性守卫：
  - `pnpm lint:maintainability:guard`
  - 结果：命令未全绿
  - 非本次阻断原因：
    - `apps/maintainability-console/scripts/dev.mjs`
    - `apps/maintainability-console/shared/maintainability-types.ts`
  - 结论：本次触达文件的新增 error 已清零；当前剩余阻断来自工作区内其它已存在的新增/重命名文件命名治理

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
6. 将模型切到 `custom-1/gpt-5.4`（`aigateway.chat`），保持 `session_type=native`，发送一句 `Reply exactly OK`。
7. 确认请求不再在回车后立即报 `HTTP 500`，而是能正常收到 assistant 文本 `OK`。

## 可维护性总结汇总

- 长期目标对齐 / 可维护性推进：
  - 本次顺着“统一入口、统一成功语义、行为可预测”推进了一小步。heartbeat、cron、session-request 不再各自补最后一跳，而是统一依赖 backend 暴露的单一 send contract，这更符合 NextClaw 作为统一操作层的方向。
  - primary contract 是 `runApi.send()` 对调用方暴露成功结果的协议；这里属于执行路径，不是纯观察路径，也不应依赖调用方自行补救。自动触发调用方（heartbeat、cron）若被迫各自 fallback，会把运行时协议错误伪装成局部成功；本次明确拒绝这种路径。
  - 本次顺手减债点：删掉消费者侧 fallback，把“最后一条 assistant message 的成立条件”收回 backend 单点处理。
  - 本次续改已经把 codex / claude runtime 的成功终态向这条原则继续推近了一步；而这轮 `native` 续改则把“同一个 provider 在不同 runtime 下行为分裂”的问题继续往收敛方向推了一步，避免用户看到 `codex` 能用、`native` 却直接 500 的惊讶失败。
  - 下一步若还要继续收敛，应考虑把 OpenAI-compatible provider 对 root base 与 `/v1` 的解析策略也提升为更集中、更可复用的公共契约，而不是继续把类似能力藏在各 runtime 自己的探测逻辑里。
- 可维护性复核结论：通过
- 本次顺手减债：是
- 代码增减报告：
  - 新增：445 行
  - 删除：193 行
  - 净增：+252 行
- 非测试代码增减报告：
  - 新增：278 行
  - 删除：107 行
  - 净增：+171 行
- 可维护性总结：
  - 本次是否已尽最大努力优化可维护性：是。续改没有继续在 backend 或 consumer 叠加新 fallback，而是只把漏掉的 runtime 成功终态补齐到已有 contract；同时把新增逻辑拆到 runtime 局部 helper，避免继续推高原始热点文件。
  - 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。这次没有往 backend 再加兜底，而是把 `native` 的 provider 行为直接改对；同时在收尾时把临时膨胀出来的 stream/response 处理再次拆散，避免把复杂度永久堆在 `openai_provider.ts`。
  - 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：部分做到。相对本迭代起点仍是净增，但这轮续改已把 `openai_provider.ts` 从 `759` 行压回 `649` 行，并把新增 helper 放到 `utils/openai/` 下，避免继续恶化 `providers/` 目录平铺度。
  - 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。root base 候选、responses 输出归一化、chat-completions stream 累积三块职责已拆开；主 provider 只保留“按候选 base 依次尝试”的协调职责。
  - 目录结构与文件组织是否满足当前项目治理要求：基本满足。本次新增 helper 已从 `providers/` 平铺目录迁到 `utils/openai/`，避免命中 provider 角色边界治理；当前守卫剩余阻断不在本次触达范围内。
  - 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：是。本结论基于独立复核，而不是只复述守卫；当前 `no maintainability findings`。
  - no maintainability findings
