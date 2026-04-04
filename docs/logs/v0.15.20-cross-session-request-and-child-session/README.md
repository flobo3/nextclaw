# v0.15.20-cross-session-request-and-child-session

## 迭代完成说明

本次完成了 cross-session request 与 child session 的 Phase 1 落地，核心结果如下：

- 后端把旧 `spawn/subagent/follow-up` 主链收敛为 `child session + session request + delivery service`，并删除旧的 `ncp-subagent-completion-*` 平行实现。
- `spawn` 现在走 child session 语义；`sessions_spawn` 和 `sessions_request` 进入同一套 request/broker 抽象。
- 后续补齐了一个关键验收修正：`sessions_spawn` 现在会创建普通 session，而不是错误地落成 child session；因此普通会话会重新出现在会话列表里，`sessions_request` 卡片也会正确显示为 `session` 而不是 `child`。
- 本轮继续补齐了 AI 编排提示：`spawn` / `sessions_spawn` / `sessions_request` 的选择策略、推荐链路，以及 `sessions_request.target` 的对象参数形状已进入 NCP 系统提示；工具 description 也同步强化，减少模型“知道工具存在但不会主动正确使用”的情况。
- `resume_source` 已打通：目标会话完成后，父会话 tool result 会更新为 `nextclaw.session_request` 的 `completed`，然后继续父会话本轮后续输出。
- 前端已接入 child session 卡片、child session 详情面板、父子会话返回入口，以及 child session 默认不进入顶层侧边栏平铺。
- `createUiNcpAgent` / deferred agent 相关 owner 已收敛出明确 `dispose/close` 资源回收边界，避免继续以 closure-backed owner 扩散。
- 本轮继续完成 cross-session realtime 架构收敛：删除 `LiveSessionExecution.publisher`，把 realtime ownership 收回到 session 级唯一 publisher，`sessions_request` 这类 run 外异步结果写回不再依赖刷新修正前端状态。
- HTTP transport 已切换为单一 session stream 语义：`/send` 只返回 json ack，`/stream` 成为唯一 realtime 消费入口；前端删除 `session.run-status -> attachRealtimeSessionStream` 补挂逻辑，进入会话页面后即建立唯一 session stream 订阅。
- 本轮顺手减债：删除 `agent-backend-append-message.ts`、`agent-backend-update-tool-call-result.ts`、`agent-backend-stream.ts` 三个旧 helper 文件；同时把 session-level realtime 收敛进 `AgentBackendSessionRealtime`，把 execution 生命周期收敛进 `agent-backend-execution-utils.ts`，避免 `DefaultNcpAgentBackend` 继续膨胀成混合职责文件。

相关设计文档：

- [Cross-Session Request And Child Session Design](/Users/peiwang/Projects/nextbot/docs/plans/2026-04-03-cross-session-request-and-child-session-design.md)
- [Cross-Session Request And Child Session Implementation Plan](/Users/peiwang/Projects/nextbot/docs/plans/2026-04-03-cross-session-request-and-child-session-implementation-plan.md)

## 测试/验证/验收方式

已执行：

- `pnpm -C packages/nextclaw exec vitest run src/cli/commands/ncp/nextclaw-ncp-tool-registry.mcp.test.ts src/cli/commands/ncp/create-ui-ncp-agent.subagent-completion.test.ts`
- `pnpm -C packages/nextclaw-ui test -- src/components/chat/adapters/chat-message.adapter.test.ts src/components/chat/ncp/ncp-session-adapter.test.ts`
- `pnpm -C packages/nextclaw-agent-chat-ui tsc`
- `pnpm -C packages/nextclaw-ui tsc`
- `pnpm -C packages/nextclaw tsc`
- `pnpm -C packages/nextclaw-core tsc`
- `pnpm -C packages/nextclaw exec vitest run src/cli/commands/ncp/nextclaw-ncp-context-builder.test.ts src/cli/commands/ncp/nextclaw-ncp-tool-registry.mcp.test.ts`
- `pnpm lint:maintainability:guard`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit test -- src/agent/in-memory-agent-backend.test.ts`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-server test -- src/index.test.ts`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-client test -- src/index.test.ts`
- `pnpm -C packages/nextclaw-ui test -- src/components/chat/useHydratedNcpAgent.test.tsx src/components/chat/useNcpAgentRuntime.test.tsx`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit tsc`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-server tsc`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-client tsc`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-react tsc`
- `pnpm -C packages/nextclaw-ui tsc`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit lint`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-server lint`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-client lint`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-react lint`
- `pnpm -C packages/nextclaw-ui lint`

结果：

- 后端目标测试通过；其中新增 NCP context builder / tool registry 目标测试通过，`2 files / 10 tests passed`
- 前端目标测试通过，`2 files / 24 tests passed`
- 四个相关包类型检查通过
- `nextclaw-ncp-toolkit` 目标测试通过，`1 file / 12 tests passed`
- `nextclaw-ncp-http-agent-server` 目标测试通过，`1 file / 7 tests passed`
- `nextclaw-ncp-http-agent-client` 目标测试通过，`1 file / 5 tests passed`
- `nextclaw-ui` 目标测试通过，`2 files / 2 tests passed`
- `nextclaw-ncp-toolkit`、`nextclaw-ncp-http-agent-server`、`nextclaw-ncp-http-agent-client`、`nextclaw-ncp-react`、`nextclaw-ui` 类型检查通过
- 相关包 lint 通过；输出仅包含仓库内既有 warning，本次改动未新增 lint error
- `pnpm lint:maintainability:guard` 已执行。当前唯一 error 来自工作区中另一条未完成改动 `scripts/project-pulse-data.mjs` 超出新文件预算，与本次 cross-session realtime 收敛无关；本次链路相关文件已把主线报警压回预算内，仅保留 `agent-backend.ts` 与 `in-memory-agent-backend.test.ts` 接近预算的 watchpoint，以及若干既有目录 warning

## 发布/部署方式

本次未执行发布或部署。

原因：

- 当前交付目标是完成设计落地、代码实现与本地验证闭环，不包含用户明确要求的发布动作。
- 如需后续发布，应按项目既有发布流程执行版本变更、联动发布与发布后文档检查。

## 用户/产品视角的验收步骤

1. 在 chat 中让 agent 执行类似“spawn a subagent to verify 1+1=2”的任务。
2. 确认主会话里出现 child session tool card，状态先为运行中，随后变为完成。
3. 确认该卡片可以打开 child session 详情；桌面端为右侧详情面板，移动端为独立子页面。
4. 确认 child session 不会默认作为普通会话平铺到顶层侧边栏。
5. 确认 child session 完成后，父会话继续输出后续回复，而不是只停留在静态 tool result。
6. 确认 child session 视图有明确的返回父会话入口和 breadcrumb。
7. 在 chat 中让 agent 调用 `sessions_spawn` 创建一个非子会话，再对该会话调用 `sessions_request`。
8. 确认新会话会出现在普通会话列表中。
9. 确认 `sessions_request` 卡片上的目标类型显示为 `session`，点击后进入普通会话视图，而不是 child session 视图。
10. 在“另开一个独立会话继续做这件事”这类表述下，确认模型优先走 `sessions_spawn` + `sessions_request`，而不是错误地调用 `spawn`。
11. 确认模型在调用 `sessions_request` 时传入的 `target` 形状为对象 `{ "session_id": "..." }`，而不是裸字符串。
12. 保持 source session 页面停留在前台，不刷新页面，让目标会话完成 `sessions_request`。
13. 确认 source session 里的 `sessions_request` tool card 会在当前页面实时从 `running` 进入 `completed`，不再依赖刷新恢复。
14. 确认普通 assistant 文本流在 `/send` 已改为 ack 后仍能正常实时出现，说明页面实际消费的是唯一 `/stream`。

## 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。本轮不是给 `sessions_request` 再补一个事件或前端特判，而是删除 execution-level realtime、删除 `/send` SSE、删除 run-status 补挂逻辑，直接收敛成单一 session stream。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：基本满足。本次删除了 3 个 backend helper 文件与一整套旧双轨 realtime 语义，同时只新增 2 个更聚焦的 backend 模块来压住 `agent-backend.ts` 的体积；总代码没有做到净减少，但增长已被限制在“让旧双轨真正消失”的最小必要范围内。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。session-level realtime 现在由 `AgentBackendSessionRealtime` 统一持有，execution lifecycle 回到无状态 utility，前端 stream attach 回到 hydrated agent hook；没有新增 `sessions_request` 专用 adapter、replay service 或双轨兼容层。
- 目录结构与文件组织是否满足当前项目治理要求：部分满足。`packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/agent-backend/` 已从 13 个直接文件收敛到 12 个，回到目录预算边界内；`packages/nextclaw-ui/src/components/chat/ncp` 仍是历史大页面聚集区，本次通过抽出 seed loader 把 `NcpChatPage` 的函数预算问题压回去，但目录本身仍适合后续继续整理。
- 若本次涉及代码可维护性评估，是否基于独立于实现阶段的 `post-edit-maintainability-review`：是，已独立复核并结论如下。

可维护性复核结论：保留债务经说明接受

本次顺手减债：是

1. `packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/agent-backend/agent-backend.ts` 目前已回到 budget 内，但仍接近上限。
2. 这会让后续再往 backend 里叠加 session orchestration 逻辑时重新膨胀。
3. 更小、更简单的后续方向是继续把只读 session API 或测试夹具进一步拆离，而不是重新往 `DefaultNcpAgentBackend` 回塞分支。

1. `packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/in-memory-agent-backend.test.ts` 现在覆盖更完整，但也逼近体积预算。
2. 后续如果继续在同一文件叠加 cross-session 场景，测试维护成本会明显上升。
3. 更小、更简单的后续方向是把 echo/gated runtime builder 与复用 fixture 拆出，测试文件只保留行为断言。

可维护性总结：这次改动真正删掉了旧双轨 realtime 语义，而不是把 `sessions_request` 再做成一个例外；新增的少量代码主要用于把 session-level realtime ownership 放到正确边界里，并把超预算的 backend/page 再压回可控范围。保留债务主要是 `agent-backend.ts` 与一份 toolkit 测试文件接近预算，以及工作区里另一条 `project-pulse` 改动导致的 guard 失败，这些都已明确隔离与标注。
