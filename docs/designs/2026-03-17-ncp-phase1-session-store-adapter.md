# NCP Phase 1 Session Store Adapter

## 目标

本文件记录 `Phase 1` 中 NCP 并行后端链路对现有 NextClaw session 存储的适配语义。

本阶段不迁移底层存储层本体，只通过 adapter 让 NCP backend 与既有 `SessionManager` 共享同一份会话数据。

## 适配边界

1. NCP backend 使用独立 runtime、独立 HTTP 路由、独立 session API。
2. 底层持久化继续落在现有 `SessionManager` 管理的 session 文件上。
3. legacy `/api/chat/*` 与 `/api/sessions/*` 保持原样，不反向依赖 NCP 编排。

## 读路径映射

`SessionManager -> AgentSessionStore`

1. `session.key` 映射为 `sessionId`
2. `session.updatedAt` 映射为 `updatedAt`
3. `session.messages` 映射为 `NcpMessage[]`

消息语义映射：

1. legacy `user/system/service` 文本消息映射为对应 role 的 NCP text message
2. legacy `assistant.content` 映射为 assistant text parts
3. legacy `assistant.reasoning_content` 映射为 assistant reasoning parts
4. legacy `assistant.tool_calls` 映射为 assistant `tool-invocation` parts
5. legacy 后续 `tool` role 消息会尽量回填到前一个 assistant message 的同一 `toolCallId` 上，转成 `tool-invocation.result`

## 写路径映射

`AgentSessionStore -> SessionManager`

1. NCP session 保存时，不替换底层存储格式，只重建 legacy session events/messages
2. 既有 session metadata 保留，不因 NCP 写入而丢失
3. assistant NCP message 会展开回 legacy assistant message
4. assistant 中的 `tool-invocation` result 会展开回 legacy `tool` role messages

写回规则：

1. assistant text parts 合并回 `content`
2. reasoning parts 合并回 `reasoning_content`
3. tool-invocation args 回写为 `tool_calls`
4. tool-invocation result 回写为独立 `tool` message

## 当前限制

1. 本阶段仍以文本、reasoning、tool invocation 为主，不追求一次覆盖所有 NCP part 类型
2. 非 legacy 原生语义的 part 会以保守方式回写，优先保证数据不丢失，再保证展示完全等价
3. 本阶段未引入 legacy tool/runtime 编排复用；tool registry 仍按 NCP 独立建设，当前后端主链路先以基础 agent run 打通为主

## 验收口径

1. NCP backend 可以读取既有 session 历史
2. NCP backend 新写入的消息会继续落到既有 session 存储
3. 删除 NCP session 时，删除的是同一份底层 session 数据
4. legacy 链路不需要因本 adapter 做结构改造
