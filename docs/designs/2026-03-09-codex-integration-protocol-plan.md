# Codex 接入协议规划（NCIP v1 草案）

## 背景与目标

当前我们在讨论的是“新迭代前的规划”，不是正式迭代交付。
因此本文件放在 `docs/designs`，不进入 `docs/logs` 迭代记录。

目标：
- 先定义统一接入协议（最低标准 + 可选能力）
- 先以 Codex 做蓝本评估可行性
- 明确哪些共享值得做，哪些不值当可放弃

## NCIP v1（NextClaw Capability Integration Protocol）

### A. 最低标准（必须满足）

1. Capability Manifest
- 必须声明：`engineKind`、`version`、`supportsStreaming`、`supportsAbort`、`supportsRunStream`
- 必须声明共享等级：`sharedLevel`（`minimal`/`partial`/`full`）

2. Session Contract
- 必须提供稳定的 `sessionKey -> externalSessionId` 映射
- 必须保证同一 `sessionKey` 连续对话

3. Turn Contract
- 必须有统一调用语义（`processDirect` / `handleInbound`）
- 必须输出统一事件：`turn.started`、`turn.delta`、`turn.completed`、`turn.failed`

4. Abort/Timeout Contract
- 必须支持超时终止
- 若 `supportsAbort=true`，必须支持显式中断并返回确定状态

5. Persistence Contract
- 必须把用户输入、助手输出、关键引擎事件写入 NextClaw 会话层

6. Error Contract
- 必须统一到：`config_error`、`auth_error`、`runtime_error`、`timeout_error`、`abort_error`

7. Security Boundary Contract
- 必须支持工作目录与权限模式配置
- 必须支持网络访问策略配置

### B. 可选能力（按价值逐步接入）

- `O1 Context Bridge`：共享 NextClaw ContextBuilder（bootstrap、预算裁剪）
- `O2 Memory Bridge`：共享 memory 注入与 memory tool 语义
- `O3 Tool Bridge`：共享 NextClaw ToolRegistry（桥接到外部能力）
- `O4 Skill Bridge`：共享 requested_skills + always skills + skills summary
- `O5 Routing/Handoff Bridge`：共享跨 agent 路由与 handoff
- `O6 Observability Bridge`：共享统一 metrics/cost/tracing

约束：
- 可选能力未实现必须标注 `not-shared`
- 禁止把 `minimal` 说成“完全共享”

## Codex 基线梳理（按 NCIP v1）

### 已满足 / 基本满足
- 会话连续性：具备（thread 复用）
- 流式事件：具备（runStreamed + 事件落会话）
- 基础持久化：具备（user/assistant/engine events 可落盘）
- 安全边界基础：具备（sandbox、approval、workingDirectory 等配置）

### 部分满足
- Skill 共享：目前主要是 `requested_skills` 注入，非完整 skill 体系共享
- 错误统一：有透传，尚未完成 NCIP 的标准错误分类

### 未满足
- 显式中断闭环（stop/abort）未形成统一能力承诺
- Tool Bridge 尚未共享 NextClaw ToolRegistry
- Memory/Context 深度共享尚未打通

### 当前判断
- Codex 当前更适合定位为“隔离能力后端（可运行）”，不是“深度共享内核”

## 推进建议（先 Codex）

### Phase 1：先达标（不强耦合）
- 把最低标准补齐，重点是 abort 与 error normalization
- 对外明确 `sharedLevel=minimal`

### Phase 2：只做值当共享
- 优先做 `O3 Tool Bridge`
- 次优先做 `O2 Memory Bridge`
- 对高成本低收益项维持 `not-shared`

## 已确认决策（本轮讨论结论）

### 1) 会话类型交互策略（Phase 1）

- 新建会话默认类型始终为 `native`。
- `codex/claude` 仅作为扩展能力，不改变默认体验。
- 当相关插件未启用时：
  - UI 不展示 `codex/claude` 会话类型选项。
  - 行为与历史版本保持一致。
- 当相关插件已启用时：
  - 新会话在“首条用户消息发送前”提供类型切换入口（`native/codex/claude`）。
  - 用户首条消息成功发送后，会话类型立即锁定，不可再修改。

### 2) 类型锁定规则

- 会话一旦进入“已发送首条用户消息”状态，`sessionType` 永久不可变。
- 如需切换类型，只能新建会话（或后续支持“克隆为新会话”）。
- 该规则适用于 `native/codex/claude` 全部类型。

### 3) 后端硬约束（必须实现）

- 会话表新增并持久化 `sessionType` 字段。
- 类型更新接口必须校验：仅 `user_message_count == 0` 时可改类型。
- “首条消息写入”与“类型锁定”需同一事务提交，避免竞态绕过。
- 旧会话无 `sessionType` 的兼容策略：按 `native` 处理。

### 4) 插件禁用后的行为

- 禁用插件后，新会话不再展示对应类型选项。
- 已存在的该类型会话不自动改为 `native`，保持原类型并标记“当前能力不可用”。
- 用户可选择重新启用插件或新建 `native` 会话。

## Phase 1 验收标准（新增）

1. 未启用扩展插件时，新建会话流程与现状完全一致。
2. 已启用扩展插件时，首条消息前可切换类型；发送后入口消失且后端拒绝改类型。
3. 同一会话类型路由稳定，消息不会跨引擎串路由。
4. 历史会话兼容正常，默认按 `native` 读取。

## 待确认问题（更新后）

1. `supportsAbort` 的验收标准是否要求“外部执行真实停止”。
2. `Tool Bridge` 在 Codex 侧优先走 MCP 适配还是进程内桥接。
3. `Memory Bridge` 采用注入式还是检索式共享。
4. `sharedLevel` 是否需要在 UI/CLI 明示给用户。
