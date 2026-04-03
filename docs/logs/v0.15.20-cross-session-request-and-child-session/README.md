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

结果：

- 后端目标测试通过；其中新增 NCP context builder / tool registry 目标测试通过，`2 files / 10 tests passed`
- 前端目标测试通过，`2 files / 24 tests passed`
- 四个相关包类型检查通过
- 可维护性守卫与新代码治理检查通过；仅保留历史 warning，包括 `packages/nextclaw-ui/src/components/chat/adapters/chat-message.adapter.test.ts` 接近预算，以及 `packages/nextclaw/src/cli/commands/ncp` 目录/个别文件的历史体积预警

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

## 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。本次不是继续给旧 subagent 回传链补丁，而是删除旧文件、统一到 session-request 目录和 broker/delivery/class owner 边界。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：基本满足。虽然本轮仍有必要的 UI 接入和协议落地代码增长，但它是伴随删除旧 `ncp-subagent-completion-*` 文件和多份平行实现一起发生的，属于以统一抽象替换旧分叉的最小必要增长。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。`SessionRequestBroker`、`SessionRequestDeliveryService`、`SessionCreationService`、`PluginRuntimeRegistrationController`、`DeferredUiNcpAgentControllerOwner` 的 owner 边界比原有 closure/follow-up 特判更清晰；并且本轮没有把 NCP 编排提示塞进 `messageToolHints`，而是给 `ContextBuilder` 增加了一个通用的 `additionalSystemSections` 注入点，让 NCP 以独立 section 注入 session orchestration 规则。
- 目录结构与文件组织是否满足当前项目治理要求：部分满足。`packages/nextclaw/src/cli/commands/ncp/session-request/` 已形成清晰子目录；但 `packages/nextclaw-ui/src/components/chat/ncp` 仍被治理脚本标记为 flat mixed-responsibility directory，本次未继续拆目录，以免在功能落地主链之外引入额外 UI 结构漂移。后续可在独立整理批次中继续细分。
- 若本次涉及代码可维护性评估，是否基于独立于实现阶段的 `post-edit-maintainability-review`：是，已独立复核并结论如下。

可维护性复核结论：保留债务经说明接受

本次顺手减债：是

no maintainability findings

可维护性总结：这次修复没有在 `sessions_spawn` 外层再补一个“前端特判”或“结果纠偏”，而是把普通 session / child session 的创建统一收口到 `SessionCreationService`，从源头修正语义；后续这轮提示词增强也没有走“在 NCP builder 里硬拼接一堆 message hints”的捷径，而是最小幅度扩展 `ContextBuilder` 的系统提示注入边界。保留的主要债务仍是若干历史大文件与平铺目录 warning；它们本次没有继续恶化，但后续仍适合按职责继续拆分。
