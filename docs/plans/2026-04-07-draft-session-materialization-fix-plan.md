# 2026-04-07 Draft Session Materialization Fix Plan

## 背景

当前 NCP chat / 新绘画页在用户尚未发送第一条消息时，前端 draft session 已经开始自动 hydrate + stream。

后端 live stream 路径会在订阅时 `ensureSession`，导致：

- 未物化的 draft session 被提前创建
- 初始渲染和后续 draft id 切换可能制造多个空会话
- 空会话进入 session list，对用户可见

这违反了“只有真实用户动作才应物化会话”的边界。

## 目标

一次性收紧 session 生命周期边界：

1. draft session 在第一条消息发送前不能被后端隐式物化
2. `/stream` 是只读订阅，不再隐式创建 session
3. 新建页一次只持有一个稳定 draft id
4. 不破坏已有 session 的 hydrate / stream / resume 行为
5. 不破坏“draft session 可先 patch metadata / 查询 skills”的既有能力

## 方案

### 前端

- `NcpChatPage` 去掉初次挂载时“先生成一份 draft id，再在 effect 里立刻生成第二份”的行为。
- 保留 draft session 的预连接 stream 能力，以保证第一条消息发送时仍能无缝接收 assistant 输出。
- 前端不再依赖“第二次生成 draft id 来纠正状态”，而是用稳定单 draft id 承接新建页生命周期。

### 后端

- `AgentBackendSessionRealtime.streamSessionEvents()` 不再调用 `ensureSession()`
- 若 session 尚不存在：
  - 允许建立“被动等待事件”的订阅
  - 但不创建 live session，不写入 list，不持久化
- 当后续真实 send 触发 session 创建并发布事件时，等待中的 stream 订阅仍可收到事件

## 验收标准

1. 打开新会话 / 新绘画页，不发送消息时，session list 不出现空会话
2. 第一次发送消息后，只创建一个 session
3. 重新进入新会话页，不会额外泄漏空 session
4. 已存在 session 仍可正常 hydrate 历史并接收 live stream
5. draft session 的 skills / patch 路径保持可用

## 风险与控制

- 风险：把“draft 可先观察技能/元信息”的既有能力误删
  - 控制：只收紧隐式建会话，不改 draft patch / skills 契约，也不移除 draft 的预连接 stream
- 风险：无 session 时 stream 订阅失去后续事件
  - 控制：后端对不存在 session 改为被动等待，而不是直接失败或创建
