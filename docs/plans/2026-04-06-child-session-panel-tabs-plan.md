# Child Session Panel Tabs Plan

日期：2026-04-06

相关文档：

- [NCP Session Conversation Unification Plan](./2026-04-06-ncp-session-conversation-unification-plan.md)
- [NextClaw 产品愿景](../VISION.md)

## 1. 目标

在已完成 child session 实时会话统一之后，继续完成两项 UI 收敛：

1. `spawn` / `sessions_request` 工具卡片在未展开状态下提供轻量直达入口。
2. 右侧 child session 面板从“单会话详情”升级成“当前父会话下的多 child session tab 容器”。

## 2. 核心边界

### 2.1 tool action 只感知 agentId

工具卡片与 tool action 不应依赖 `displayName`、`avatarUrl` 等派生展示信息。

本轮只允许在 `ChatToolActionViewModel` 与 session request tool result 中增加：

- `agentId`

后续头像与展示名统一在 UI 层用 `agentId + availableAgents` 解析。

### 2.2 卡片层只做轻量展示

卡片基础层不引入 agent 目录查询，不直连 session summary query，也不自行推导头像与名称。

如果 action 或 tool card 带了 `agentId`：

- 基础 UI 包只暴露注入点，让业务层按需渲染 agent 标识
- 可以在 header 里提供轻量直达入口直接打开侧栏

真实头像 URL、展示名与其它派生信息统一在业务层通过 `agentId` 解析。

### 2.3 child panel 改成父会话作用域的 tabs

当前单字段模型：

- `childSessionDetailSessionKey`
- `childSessionDetailParentSessionKey`
- `childSessionDetailLabel`

需要删除，改成：

- 当前父会话作用域下的 opened child session tabs
- 当前激活 child session key

这样同一父会话下打开多个 child session 时，右侧仍是一个整体面板，但顶部可切换。

## 3. 实施方式

### 3.1 后端 / tool result

让 `nextclaw.session_request` result 在已知时返回 `agentId`。

来源：

- `spawnChildSessionAndRequest` 直接从新建 child session 记录里拿
- `requestSession` 从 target session summary 里拿

### 3.2 前端 tool action

`ChatToolActionViewModel` 增加可选 `agentId`。

session request tool card adapter 只把 `agentId` 透传到 action。

### 3.3 前端工具卡片

在 generic tool card header 增加一个极轻的 action trigger：

- 不需要先展开内容
- 若存在 `agentId`，通过业务层注入的统一 Agent 标识组件展示头像
- 点击后直接执行 `onToolAction`

已展开内容里的大按钮删除，避免重复入口和视觉噪音。

### 3.4 child panel tabs / Agent 标识基础设施

chat thread store 收敛为：

- child session tabs 列表
- active child session key

manager 负责：

- 打开时 upsert tab
- 激活已存在 tab
- 关闭时清理当前父会话作用域下的 tabs

panel 负责：

- 只消费 `agentId`
- 通过统一业务组件解析并展示 agent 头像
- 基于 active tab 渲染对应 session conversation

统一 Agent 标识基础设施负责：

- 暴露只接收 `agentId` 的业务组件
- 内部优先复用当前会话 snapshot 中的 `availableAgents`
- 再复用全局 `useAgents()` query cache 做补充解析
- 不再新增一层重复的全局 agent store

## 4. 禁止事项

1. 禁止在 tool card 基础层引入 agent 查询或头像 URL 依赖。
2. 禁止在 child panel 保留旧的单会话状态字段与新 tab 状态并存。
3. 禁止为 tabs 或 agent 标识再加一套独立 store 或 query 镜像。
