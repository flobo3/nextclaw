# NCP Session Conversation Unification Plan

日期：2026-04-06

相关文档：

- [NextClaw 产品愿景](../VISION.md)
- [NCP Single Session Stream Design](./2026-04-04-ncp-single-session-stream-design.md)
- [NCP Session Realtime Sync Refactor Plan](./2026-03-29-ncp-session-realtime-sync-refactor-plan.md)

## 1. 这次要解决的真实问题

表面现象是：

- `spawn` 产生子代理后，主会话里的 tool card 可以打开子会话侧栏。
- 侧栏能看到历史消息，但不会随着子会话实时流继续刷新。
- 用户必须关闭重开或刷新页面，才能看到更完整的结果。

真正问题不是“侧栏少了一次 refetch”，而是：

**同一个 NCP session，在主会话视图和子会话侧栏里走了两套完全不同的状态模型。**

- 主会话走 `useHydratedNcpAgent` 的实时 conversation runtime。
- 子会话侧栏走 `useQuery(fetchNcpSessionMessages)` 的静态历史读取。

这违反了本项目对统一体验、单一真相源和可维护性的要求。

## 2. 本次决策目标

本次不是补一个子会话订阅开关，而是一次性完成以下收敛：

1. 让“查看任意 session 的会话内容”统一走一套会话运行时抽象。
2. 删除“主会话实时 runtime / 子会话静态 query”这组并行模型。
3. 不引入新的镜像 store、补丁式 refetch、轮询或特殊分支。
4. 保证主会话和子侧栏可以同时存在、同时实时更新、互不打断。

## 3. 当前实现的问题边界

### 3.1 主会话的实现是对的，但抽象仍被困在页面内

当前主会话页已经有正确的实时链路：

- seed loader 先拉历史消息
- `useHydratedNcpAgent` 负责 hydrate
- `useNcpAgentRuntime` 负责订阅 endpoint 事件流并落到 manager
- 页面消费 `visibleMessages`

问题不在 runtime 本身，而在于：

- seed loader 定义在 `NcpChatPage`
- endpoint 实例也定义在 `NcpChatPage`
- 这导致子会话侧栏无法以干净方式复用同一套会话 runtime 能力

### 3.2 子会话侧栏当前是第二套状态模型

子会话侧栏当前直接：

- `useQuery(['ncp-session-messages', sessionKey, 'child-panel'])`
- 读取一次 `fetchNcpSessionMessages`
- 直接把返回的 `messages` 渲染给 `ChatMessageListContainer`

这条链路没有实时 stream、没有运行态、没有 streaming message 概念，只是“历史快照面板”。

### 3.3 共享同一个 endpoint 实例是错误方案

不能简单把主会话当前的 `ncpClient` 传给侧栏复用。

原因：

- `useHydratedNcpAgent` 在 hydrate 前会调用 `client.stop()`
- `NcpHttpAgentClientEndpoint.stop()` 会中止当前实例下所有活跃 controller

如果主会话和子会话共用同一个 endpoint 实例，会出现：

- 子侧栏打开时，主会话 stream 被停止
- 子侧栏关闭或切换 session 时，主会话 stream 也可能被停止

这会制造更隐蔽、更难调试的跨视图耦合。

## 4. 最终架构

### 4.1 新的稳定抽象：Session Conversation

新增一个共享 hook，负责“给定 sessionId，返回该 session 的会话运行时”。

建议命名：

- `useNcpSessionConversation`

它的职责只有三件事：

1. 创建当前 session viewer 私有的 `NcpHttpAgentClientEndpoint`
2. 通过统一 seed loader 拉取历史消息和运行态
3. 复用 `useHydratedNcpAgent` 提供实时 conversation state

### 4.2 主会话页和子会话侧栏都消费同一抽象

- `NcpChatPage` 不再自己拼 seed loader + endpoint
- `ChatChildSessionPanel` 不再自己维护 `useQuery(messages)`
- 两个视图都调用 `useNcpSessionConversation(sessionId, options?)`

这样“看一个 session”只有一条主链：

`sessionId -> session conversation hook -> hydrated runtime -> visibleMessages`

### 4.3 数据边界

本次需要把 seed 获取提升为一个小而硬的共享读取函数，例如：

- `fetchNcpSessionConversationSeed(sessionId)`

返回：

- `messages`
- `status`

这样主会话和子会话都不必再自己拼：

- 一边从消息接口拿 `messages`
- 一边从 session summary 猜 `running/idle`

## 5. 删除清单

这次必须明确删除，而不是保留双轨：

1. 删除 `ChatChildSessionPanel` 内部的 `useQuery(fetchNcpSessionMessages)` 读取路径
2. 删除 `NcpChatPage` 内联的会话 seed loader 拼装逻辑
3. 删除“子侧栏是静态消息面板，主会话是实时 runtime”这一语义分叉

这次不做、也明确禁止新增：

1. 不新增专门给子侧栏用的 store
2. 不新增专门给子侧栏用的 websocket / SSE 订阅拼装代码
3. 不新增 `refetchInterval`
4. 不新增“打开侧栏后再 invalidate 某个 query”的补丁逻辑

## 6. 实施方式

### 6.1 第一步：抽 session conversation 基础设施

新增共享模块，职责拆分如下：

- `createNcpSessionClient`
  - 每个 viewer 一份 endpoint 实例
  - 不共享，不跨视图复用

- `fetchNcpSessionConversationSeed`
  - 统一读取 session conversation seed
  - 对外返回 `messages + status`

- `useNcpSessionConversation`
  - 组合上面两者
  - 对外暴露 `useHydratedNcpAgent` 返回值

### 6.2 第二步：主会话页接入

`NcpChatPage` 改为直接使用 `useNcpSessionConversation(sessionKey)`。

保留页面自己的职责：

- presenter/store 同步
- toolbar / route / selected session 协调

删除页面不该拥有的职责：

- endpoint 创建
- seed loader 拼装

### 6.3 第三步：子会话侧栏接入

`ChatChildSessionPanel` 改为：

- 使用 `useNcpSessionConversation(sessionKey)`
- 用 `agent.visibleMessages` 渲染消息
- 用 `agent.isHydrating / hydrateError / isRunning` 驱动 loading 和 sending 状态

子侧栏继续保持只读，不增加发送输入框。

### 6.4 第四步：测试收敛

至少覆盖以下行为：

1. `NcpChatPage` 切 session 时仍会立即进入 hydrating 态
2. 子会话侧栏使用共享 hook 后可以消费实时消息
3. 两个 session viewer 同时存在时，各自使用独立 client，不互相 `stop()`

## 7. 为什么这是最小复杂度方案

这次代码看上去会新增一个 hook 和少量辅助函数，但本质是在删一整套分叉模型：

- 删掉子侧栏的 query-only 模型
- 删掉页面内联的 runtime wiring
- 删掉未来继续复制这套 wiring 的可能性

也就是说，本次不是“为了复用而抽象”，而是为了把“查看 session”收敛成唯一可复用实现。

## 8. 验收标准

### 8.1 功能验收

1. 打开 child session 侧栏后，子会话流式输出能实时追加到侧栏
2. 主会话继续流式运行时，打开/关闭子侧栏不会中断主会话 stream
3. 子会话完成后，侧栏无需刷新即可看到最终状态

### 8.2 架构验收

1. 仓库中不再存在“子侧栏消息 query + 主会话 runtime”这组并行模型
2. `NcpChatPage` 不再内联 endpoint 和 seed loader 组装逻辑
3. 新抽象不引入新的 store、轮询或补丁式同步

## 9. 禁止事项

1. 禁止为了省事共享 `NcpHttpAgentClientEndpoint` 实例
2. 禁止在侧栏保留 `useQuery` 作为实时更新主路径
3. 禁止通过 `invalidateQueries` 伪装成实时同步
4. 禁止为了兼容旧结构而同时保留新旧两条渲染链路
