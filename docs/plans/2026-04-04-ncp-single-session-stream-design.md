# NCP Single Session Stream Design

## 这份文档回答什么

这份文档沉淀本次关于 `sessions_request` 实时完成态问题的完整讨论结果，目标不是记录一个局部 bug 修复，而是回答下面几个更本质的问题：

1. 当前问题的真实根因是什么，为什么它不是 `sessions_request` 单点缺陷。
2. 基于根因，分别有哪些不同架构层级的解决方案。
3. 为什么我们最终选择最彻底的方案，也就是直接采用单一 `session stream` 架构。
4. 在采用该方案时，哪些旧概念、旧通道、旧兼容层应该被坚定删除。
5. 后续一次性实现时，边界、顺序、验证标准和禁止事项是什么。

这份文档的定位是：

- 先统一认知，再开始实现
- 先做删除与收敛决策，再做代码改动
- 先定义最终架构，再决定迁移顺序

这不是一个“给现状补一个更聪明补丁”的方案文档。

## 上位目标对齐

结合 [NextClaw 产品愿景](../VISION.md)，这次架构判断必须服务于以下目标：

- 强化统一体验，而不是继续制造“不同来源的事件，要靠不同恢复方式才能看对”的碎片体验。
- 强化意图到执行的闭环，而不是把实时一致性问题转嫁给前端或用户刷新动作。
- 强化统一入口与能力编排，而不是让跨会话协作继续停留在隐式特例和历史兼容层之上。

一句话说，这次不是为了修一个卡片状态，而是为了让跨会话协作真正成为可依赖、可理解、可长期演进的产品级能力。

## 背景

当前现象是：

- `sessions_spawn` 基本正常。
- `sessions_request` 在普通会话场景下，目标会话完成并且结果已经通知回 source session 之后，前端页面如果不刷新，tool card 仍可能长时间停留在 `running`。
- 一旦刷新页面，状态又会恢复正确。

这说明：

- 持久化状态大概率是对的。
- 最终结果也确实已经写回。
- 问题集中在“实时同步链路的架构设计”，而不是“最终数据根本没写”。

## 现状链路简述

从当前代码语义看，相关链路可概括为：

1. `sessions_request` 创建一次跨会话请求。
2. 目标会话完成后，source session 会收到一次异步结果写回。
3. 写回动作会更新 source session 的状态管理器，并在某些情况下向运行时实时流发事件。
4. 前端页面的 `/stream` 并不总是能收到这类异步写回事件。
5. 但刷新后从持久化消息重建，状态能恢复正确。

说明系统里已经存在“最终状态真相源”，但实时流不是它的唯一观察入口。

## 真正根因

真正根因不是：

- `sessions_request` 少发了一个 `tool_result`
- 前端漏监听了某个特殊事件
- source session 没有恢复运行

真正根因是：

**同一个 session 的状态变化，被拆成了两套并列但不等价的实时通道。**

更具体地说：

- 一部分事件属于 “run 内事件”，由 active execution 驱动。
- 另一部分事件属于 “session 状态变化”，例如异步 tool result、附加消息、run 外完成态写回。
- 当前 `/stream` 更接近在订阅 “run stream”，而不是真正在订阅 “session stream”。

于是系统出现了一个根本性错位：

- 用户看到的是“当前 session 的实时状态”
- 但系统暴露给前端的却只是“当前 active run 的实时子集”

这就是为什么：

- 普通 run 内工具通常没问题
- `sessions_request` 这种 run 外异步完成态会暴露问题
- 刷新后又恢复，因为刷新走的是会话历史重建，而不是当前 live run 订阅

一句话归纳：

**系统缺的不是一个事件，而是“session 级单一实时真相源”。**

## 为什么这个问题不能继续按补丁思路处理

如果沿补丁路线继续做，常见手法大概有三种：

1. 前端发现 `sessions_request` 特殊，再额外补拉状态。
2. backend 在 `sessions_request` 完成时，再额外补发一类特定事件。
3. `/stream` attach 时，用 replay/snapshot 再人为补一层恢复逻辑。

这些方式都有一个共同问题：

- 它们都默认现有“多通道并存”的架构是合理的
- 然后再在其上叠加补偿机制

这违反了本次决策原则：

- 先删除
- 再简化
- 最后才允许新增

所以这次必须把讨论收敛到根因层，而不是局部补救层。

## 本次采用的核心原则

### 1. 删除优先

默认先问：

- 哪一层可以删
- 哪一个概念可以取消
- 哪一条平行链路可以并回主链

而不是先问：

- 哪个地方再补一个事件
- 哪个地方再套一个兼容逻辑

### 2. 宁可多删，不可少删

本次明确采用更激进的删除策略：

- 宁可先把历史残留删干净，再按新架构补回最小必要能力
- 也不要因为“也许还会用到”而留下半旧半新的双轨结构

因为重新实现的代价通常远小于长期维护技术债的代价。

### 3. 单一真相源优先

同一类领域事实只能有一个权威流出入口。

对本问题来说，这意味着：

- 一个 session 只能有一个对外实时事件流真相源
- UI 不应该同时依赖“run stream”和“历史恢复”才能看到正确状态

### 4. 抽象必须减少，而不是转移

如果一个方案只是：

- 把复杂度从前端移到 backend
- 或者从 backend 一个文件移到另一个文件
- 或者从 runtime 移到 replay 层

但没有减少概念数和语义分叉数，那不算真正简化。

## 不同架构层级的方案

### 方案 1：前端层补救

做法：

- 前端在检测到 `sessions_request` 或 `session.run-status=running` 后，额外补拉一次消息历史或会话状态。

优点：

- 改动局部。
- 短期止血快。

缺点：

- 本质是补丁。
- 前端开始承担后端一致性责任。
- 实时流与历史恢复继续并存为两套语义。
- 根因完全未消除。

结论：

- 不采用。

### 方案 2：保留双通道，但在 `/stream` 层补 replay

做法：

- 保留 run stream 与 session 状态变化分裂的现状。
- 在 `/stream` attach 时，先 replay 当前状态，再继续 live stream。

优点：

- 可以改善现象。
- 外部接口变化相对小。

缺点：

- 只是补偿机制，不是根因修复。
- 代码会增加。
- 架构概念不减反增。
- 双通道仍然存在，只是多了一层“追平”语义。

结论：

- 不采用。

### 方案 3：保留 `/send` 流式返回，但统一 backend 为 session stream

做法：

- backend 内部取消 `/stream` 对 active execution 私有流的依赖。
- 统一由 session 级唯一 publisher 对外提供实时流。
- run 内事件和 run 外 session 状态变化都进入同一 session 流。
- `/send` 仍可以保持当前“提交并流式返回”的形态。

优点：

- 直接命中根因。
- 概念数量明显减少。
- 前端不再需要理解“事件是否来自 active run”。

缺点：

- 虽然修了根因，但系统外部仍保留两种入口：
  - `/send` 返回流
  - `/stream` 作为订阅流
- 这意味着“提交入口”和“实时观察入口”仍未完全统一。

结论：

- 这是可接受的中间方案，但不是最简化架构。

### 方案 4：直接统一成单一 session stream 架构

做法：

- 整个系统只保留一个对外实时概念：`session stream`
- `/send` 不再承载独立实时语义，只负责提交请求
- `/stream` 成为唯一实时消费入口
- run 只是 session 内部的执行过程，不再拥有独立对外流语义
- 所有事件都进入同一个 session 级事件流

优点：

- 架构最简单
- 真相源唯一
- 最符合“删除优先、简化优先”
- 长期最不容易重新长出特例

缺点：

- 改动面最大
- 需要一次性重构 `/send` 与 `/stream` 语义边界
- 需要同步审视前端 runtime 的消费方式

结论：

- 本次直接采用

## 为什么最终选择方案 4

因为从根因出发，真正应该被质疑的不是 `sessions_request`，而是下面两个更大的设计前提：

1. 为什么对外存在“run-level 实时流”和“session-level 状态变化”两种并列语义？
2. 为什么同一个 session 的事实变化，不经过同一条实时真相源？

只要这两个前提不被打破，后面无论补多少“同步机制”“特殊 replay”“特殊事件转发”，都只是继续维护旧债。

所以最优决策不是：

- 修一个点
- 或保留旧结构再做兼容

而是：

- 直接重新定义实时架构
- 删除旧分裂语义
- 把 session 作为唯一实时观察对象

## 最终架构结论

最终架构只保留以下三个层次：

1. `SessionState`
   - session 的状态真相源
   - 包含消息、工具状态、run 状态、错误状态等

2. `SessionStream`
   - session 的唯一对外实时事件流
   - 所有实时事件都从这里出来

3. `RunExecution`
   - session 内部的执行过程
   - 只负责产生日志/事件
   - 不再是独立对外流接口

换句话说：

- `run` 是内部执行机制
- `stream` 是外部观察接口
- 对外只暴露 session stream，不再暴露 run stream

## 更具体的最终结构

这里进一步明确：

- 这次不追求“再设计一堆新类”
- 这次追求“复用现有类，把 ownership 放对”
- 业务逻辑如果必须存在，就尽量留在已有 class 中，而不是再扩散成新的 helper/service 层

### 最终只保留的核心运行对象

后端侧最终只保留并强化以下现有对象：

1. `DefaultNcpAgentBackend`
   - 继续作为唯一编排入口
   - 继续负责 `send / stream / abort / appendMessage / updateToolCallResult`
   - 但它内部不再维护两套对外实时流语义

2. `AgentLiveSessionRegistry`
   - 继续负责 live session 的获取、创建、缓存
   - 不升级成更大的“全能 service”

3. `LiveSessionState`
   - 成为 session realtime 的唯一 owner
   - 每个 session 只有一个 session-level publisher
   - 这个 publisher 才是该 session 唯一对外实时流

4. `LiveSessionExecution`
   - 只保留 run 内部执行状态
   - 例如 controller、requestEnvelope、abortHandled、closed
   - 不再拥有独立对外 realtime publisher

### 明确不新增的抽象

本次明确不新增以下中间层，避免过度抽象：

- 不新增 `SessionMutationService`
- 不新增 `SessionRunCoordinator`
- 不新增 `SessionStreamConnectionManager`
- 不新增 replay 专用 service
- 不新增 `sessions_request` 专用同步 adapter

如果最终需要新增 class，必须满足两个条件：

- 现有类无法承载而且继续塞进去会让职责更混乱
- 新 class 能显著减少概念，而不是只是把代码搬家

## 更细的职责落点

### `DefaultNcpAgentBackend`

它在新架构下应承担以下明确职责：

- 接收所有 session 相关入口调用
- 统一把可观察状态变化写回 `LiveSessionState.stateManager`
- 统一把事件发布到 `LiveSessionState.publisher`
- 统一持久化 session
- 统一对外暴露 session-level `/stream`

它不再承担：

- 为 active execution 维护单独对外 stream
- 区分“run 内事件”和“run 外事件”走不同对外实时链路

### `LiveSessionState`

建议最终形态可近似理解为：

```ts
type LiveSessionState = {
  sessionId: string;
  runtime: NcpAgentRuntime;
  stateManager: NcpAgentConversationStateManager;
  metadata: Record<string, unknown>;
  publisher: EventPublisher;
  activeExecution: LiveSessionExecution | null;
};
```

关键变化只有一个：

- `publisher` 从“backend 全局/active execution 附属语义”收敛为“这个 session 自己的唯一 realtime owner”

### `LiveSessionExecution`

建议最终只保留内部执行需要的字段：

```ts
type LiveSessionExecution = {
  controller: AbortController;
  requestEnvelope: NcpRequestEnvelope;
  abortHandled: boolean;
  closed: boolean;
};
```

关键删除：

- 删除 `publisher`

理由：

- run 是 session 的内部执行过程
- execution 不应该再拥有对外实时流地位

## 精确删除清单

这部分是本次实现最重要的约束之一。

### 必删对象

1. `LiveSessionExecution.publisher`
2. `/stream` 只订阅 active execution 的语义
3. `/send` 返回独立 SSE 实时流的语义
4. 前端基于 `session.run-status=running` 再补挂 `/stream` 的逻辑
5. 任何 replay/补追作为最终方案存在的层
6. 任何 `sessions_request` 专用同步逻辑

### 必删判断分叉

1. “这是 run 内事件，所以走 execution.publisher”
2. “这是 run 外事件，所以走 session/global publisher”
3. “前端当前没挂到流，所以靠刷新或补拉恢复”

这些判断一旦保留，方案 4 就没有真正成立。

### 可以顺手一起删的非最优残留

如果在实现过程中发现下面这些东西只是旧架构副产物，也应顺手删除：

1. 任何只为了 `/send` 流式语义存在的 scope/filter 匹配逻辑
2. 任何只为了旧 `stream-request` forward 模式存在的重复事件泵
3. 任何只因为“当前 send 会直接带回实时事件”而存在的前端特殊状态保护

原则很明确：

- 宁可先删掉
- 真有缺口再按新架构最小补回
- 不保留“也许以后还用得上”的旧壳

## 按文件删除与收敛矩阵

这一节不是“可能会改到哪里”，而是一次性实现时的硬边界。

### `packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/agent-backend/agent-backend-types.ts`

- 必删：
  - `LiveSessionExecution.publisher`
- 必加：
  - `LiveSessionState.publisher`
- 保留：
  - `LiveSessionExecution` 只保留 run 内部执行状态
  - `LiveSessionState` 继续作为 session live truth owner

### `packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/agent-backend/agent-live-session-registry.ts`

- 必删：
  - 创建 live session 时“不拥有 session-level publisher”的旧形态
- 必加：
  - 每个 session 创建时同步创建唯一 `publisher`
- 保留：
  - registry 只负责 session 生命周期和缓存

### `packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/agent-backend/agent-backend.ts`

- 必删：
  - `publishLiveEvent(execution, event)` 这种把对外实时流绑在 execution 上的语义
  - `stream()` 对 active execution 的依赖
  - `send()` 作为前端主实时消费入口的暗含语义
- 必加：
  - 统一的 session event publish 私有方法
  - `stream()` 直接订阅 `session.publisher`
- 收敛：
  - `appendMessage()` / `updateToolCallResult()` / abort 写回走同一发布路径
  - 如无必要，直接并回 class，减少单用途 helper 文件

### `packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/agent-backend/agent-backend-stream.ts`

- 目标：
  - 优先删除整个文件
- 原因：
  - 该文件当前只是在实现“订阅 active execution.publisher”的旧语义
  - 新语义下 `stream()` 应直接回到 `DefaultNcpAgentBackend` 自己的 session publisher 逻辑

### `packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/agent-backend/agent-backend-append-message.ts`

- 目标：
  - 优先删除整个文件
- 原因：
  - 单用途 helper
  - 当前仍在分叉地向 `publisher` 与 `activeExecution.publisher` 双发
  - 应直接并回 backend class 的统一 publish 路径

### `packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/agent-backend/agent-backend-update-tool-call-result.ts`

- 目标：
  - 优先删除整个文件
- 原因：
  - 单用途 helper
  - 当前仍在分叉地向 `publisher` 与 `activeExecution.publisher` 双发
  - 应直接并回 backend class 的统一 publish 路径

### `packages/ncp-packages/nextclaw-ncp-http-agent-server/src/controller.ts`

- 必删：
  - `/send` 通过 `createForwardResponse()` 转成 SSE realtime 的语义
- 必加：
  - `/send` 直接调用 `agentClientEndpoint.send()` 后返回 json ack
- 保留：
  - `/stream` 仍走 SSE
  - `/abort` 保持不变

### `packages/ncp-packages/nextclaw-ncp-http-agent-server/src/stream-handlers.ts`

- 必删：
  - 把 terminal event 当作 session stream 生命周期终点的旧语义
- 必留：
  - `/stream` 作为 SSE 包装层本身
- 可删：
  - 如果某些 forward-path 逻辑只因 `/send` SSE 存在，则一并删除

### `packages/ncp-packages/nextclaw-ncp-http-agent-client/src/client.ts`

- 必删：
  - `send()` 通过 SSE 读取事件并发布给 subscribers 的语义
- 必加：
  - `send()` 改为 json request/ack
- 保留：
  - `stream()` 继续是唯一 SSE 消费入口
- 必调：
  - `emit(message.request)` 不再暗含“开始消费实时事件”

### `packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/agent-client-from-server.ts`

- 必删：
  - 对“`send()` 一定意味着要消费一条实时事件流”的心智假设
- 保留：
  - 兼容 server `send()` 仍返回 `AsyncIterable`
- 调整方向：
  - 只把 `send()` 视为触发执行，不把它视为唯一实时入口

### `packages/ncp-packages/nextclaw-ncp-react/src/hooks/use-hydrated-ncp-agent.ts`

- 必删：
  - `autoResumeRunningSession`
  - 只有 seed.status 为 `running` 才 attach stream 的逻辑
- 必加：
  - hydrate 完成后立刻建立当前 session 的唯一 stream 订阅
- 保留：
  - hydrate / reset / session 切换主流程

### `packages/ncp-packages/nextclaw-ncp-react/src/hooks/use-ncp-agent-runtime.ts`

- 必删：
  - `streamRun()` 作为“补挂当前 run stream”的旧心智
- 必调：
  - `send()` 只提交
  - runtime 状态消费统一依赖 client 的 session stream 订阅
- 可保留：
  - 若 UI 仍需要“resume”动作，可把它降级为“重新建立 session stream 连接”，而不是 resume run

### `packages/nextclaw-ui/src/components/chat/ncp/NcpChatPage.tsx`

- 必删：
  - `session.run-status -> attachRealtimeSessionStream`
  - 只在收到 app-level running 通知后再挂 `/stream` 的逻辑
  - `sessionStreamAttachInFlightRef`
- 保留：
  - 页面级 session hydration / send / abort 绑定
- 收敛：
  - 页面不再理解“什么时候该去挂流”，这件事回到 agent hook

### 测试文件

- 必删旧断言：
  - `/send` 会返回 SSE event stream
  - `stream()` 在 run 结束后立刻自然结束
  - attach stream 的前提是 session 当前处于 running
- 必增新断言：
  - `/send` 返回 ack
  - `/stream` 是唯一实时入口
  - idle session attach 后可以等待下一次 run
  - `sessions_request` 类型的异步 tool result 会直接通过 session stream 回到当前页面

## 后端一次性实现蓝图

### 第 1 步：收敛 session owner

目标：

- 让每个 `LiveSessionState` 拥有唯一 `publisher`
- backend 不再依赖 execution-level publisher 对外发流

改动点：

- `agent-backend-types.ts`
- `agent-live-session-registry.ts`
- `agent-backend.ts`

实施原则：

- 不新增新 service
- 直接在现有 state 对象上补齐唯一 owner

### 第 2 步：统一 publish 路径

所有会改变 session 可观察状态的动作，都必须进入同一条发布路径。

包括：

- `send()` 内 runtime 产出的 run 事件
- `appendMessage()`
- `updateToolCallResult()`
- abort 相关事件
- source session resume 触发的后续事件

建议实现方式：

- 在 `DefaultNcpAgentBackend` 内收敛出一个统一的 session event publish 路径
- 可以是私有 class 方法
- 不要再拆成独立 service

这个统一路径至少做三件事：

1. 更新 `stateManager`
2. 发布到 `session.publisher`
3. 持久化 session

### 第 3 步：重写 `stream()` 语义

`backend.stream()` 新语义必须是：

- 按 `sessionId` 订阅该 session 的唯一 realtime stream
- 不关心是否存在 active execution
- 不关心事件来自 run 内还是 run 外

这意味着：

- `agent-backend-stream.ts` 需要重写
- 目标不是“补 replay”
- 目标是“订阅 session.publisher”

### 第 4 步：简化 `send()` 语义

`backend.send()` 新语义应改为：

- 提交 request
- 启动 run
- 不再作为外部实时事件流来源

更具体地说：

- 后端内部可以继续异步驱动 run
- 但对外不再要求 `send()` 成为 SSE 主消费链路

如果保留返回值，也应该只是为了兼容接口形状，不再承载主实时语义。

### 第 5 步：取消 execution-level 对外流

完成前 4 步后，应继续把 execution-level publisher 相关逻辑整批删除，而不是标注 deprecated 留着。

这一步必须做彻底：

- 删字段
- 删 publish 逻辑
- 删 stream 订阅逻辑
- 删相关测试

## HTTP transport cutover

这部分必须拍板，否则实现时很容易回退到旧双轨。

### `/send`

最终语义：

- 纯提交接口
- 返回 json ack 或等价轻量确认
- 不再返回 SSE realtime 事件流

因此需要调整：

- `ncp-http-agent-server/src/controller.ts`
- `ncp-http-agent-server/src/stream-handlers.ts`
- `ncp-http-agent-client/src/client.ts`

### `/stream`

最终语义：

- 唯一 realtime 消费入口
- 订阅 `sessionId` 对应的所有 session 状态变化

因此：

- `createLiveStreamResponse()` 仍可以保留
- 但其底层语义必须变成单一 session stream
- 不再需要“forward path 作为主实时路径”的旧设计地位

### 对 forward path 的判断

如果某部分 forward-stream 代码只因 `/send` 流式返回而存在，在切换完成后应优先考虑删除，而不是保留。

## 前端一次性实现蓝图

### 第 1 步：进入 session 页面即建立唯一订阅

目标：

- 不再等待 `session.run-status=running` 才去 attach `/stream`
- 当前页面只维护这个 session 的单一实时订阅

这一步对应当前主要改动点：

- `NcpChatPage.tsx`
- `useHydratedNcpAgent`
- `useNcpAgentRuntime`

### 第 2 步：`send()` 只负责提交

前端 runtime 模型应调整为：

- `agent.send()` 只负责发请求
- assistant/tool/request 的后续变化统一由 session stream 进入 manager/stateManager

这意味着：

- 现有“send 同时也是实时消费起点”的心智必须删掉

### 第 3 步：删除补挂逻辑

当前这类逻辑必须直接删除，而不是保留兜底：

- `session.run-status -> attachRealtimeSessionStream`
- “只有 running 才 stream”
- “send 之后再决定是否要补挂 stream”

### 第 4 步：保留 UI 组件，不新增额外 manager

这次前端优化也遵循不过度抽象原则：

- 保留现有 hook/page 结构
- 只重写流消费方式
- 不为这次切换新增专用 manager class

## 事件模型的最终要求

从产品和调试视角看，最终系统必须满足一句话：

**任何用户在当前 session 页面看到的实时变化，都来自同一条 session stream。**

因此：

- tool result 在这条流里
- 文本增量在这条流里
- reasoning 在这条流里
- abort 在这条流里
- `sessions_request` 完成态也在这条流里

不能再存在：

- 一部分来自 send SSE
- 一部分来自 stream SSE
- 一部分来自刷新后历史重建

## 一次性切换建议顺序

为了减少双轨时间窗口，建议按下面顺序一次性切：

1. 后端先完成 `LiveSessionState.publisher` 收敛
2. 后端完成统一 publish 路径
3. 后端完成 `stream()` 改为 session stream
4. HTTP `/send` 改为纯提交
5. 前端改为进入页面即订阅唯一 session stream
6. 删除旧 execution-level stream 相关代码
7. 删除补挂/兼容/replay 逻辑
8. 最后补测试与验收

这套顺序的核心目标不是“平滑保守”，而是：

- 尽快消灭旧双轨
- 尽量缩短系统同时存在两套语义的时间

## 顺手优化原则

如果在实现过程中遇到下面这些“明显不是最优”的地方，应顺手一起优化，但前提是仍服务于主线收敛：

1. 明显只为旧双轨语义存在的冗余判断
2. 明显只为旧 `/send` SSE 设计存在的 helper
3. 明显把 session 事实和 run 事实混在一起的命名或边界
4. 明显已经不再匹配职责的字段、测试、注释

但要注意边界：

- 顺手优化的前提是帮助主线更简化
- 不是顺手把 unrelated 区域也大改一遍

## 更具体的验证标准

实现完成后，至少要验证以下行为：

1. 进入某个 session 页面后，即使当前还没 running，也已经建立该 session 的唯一 realtime 订阅。
2. 发送消息后，不依赖 `/send` SSE，页面仍能正常收到 assistant 文本流。
3. 普通工具调用状态在当前页面实时正确。
4. `sessions_request` 在普通会话场景下，目标完成后当前页面无需刷新即可从 `running` 进入 `completed`。
5. child session 场景不回归。
6. 刷新前后状态一致，不再依赖刷新修正实时状态。
7. 代码层面不再存在 execution-level 对外 realtime publisher。

## 本次设计的最终实施原则

一句话总结这份更具体方案：

**不靠新增很多抽象来修复问题，而是复用现有 class，把 realtime ownership 从 run 收回到 session，并把旧双轨整批删除。**

## 在这个目标下，必须优先删除什么

下面这些东西，应被视为优先删除对象，而不是继续保留做兼容：

### A. `execution.publisher` 作为独立对外实时流源

这是当前分裂的核心来源之一。

如果 session 已经有自己的状态真相和事件发布能力，就不应该再保留一个并列的 run-level 对外 publisher。

目标：

- 删除它作为 `/stream` 的事实来源
- 进一步目标是彻底删除它的独立对外地位

### B. `/send` 的独立流式协议语义

如果系统最终只允许一个实时真相源，那么 `/send` 不应再兼任“提交请求 + 独立消费实时流”两个职责。

目标：

- `/send` 只负责提交
- `/stream` 才是唯一实时流

### C. 任何依赖 replay 才能勉强补齐正确性的临时语义层

包括但不限于：

- attach `/stream` 时的状态追平补偿层
- 用 snapshot 合成事件的兼容层
- 为某类工具专门补发的桥接事件

这些都不应该成为最终架构组成部分。

### D. 任何 `sessions_request` 专属前端/协议特判

包括但不限于：

- `sessions_request` 专属状态同步逻辑
- `sessions_request` 专属卡片修正
- `sessions_request` 专属事件二次映射

目标是让 `sessions_request` 回归成“只是 session 里的一种普通事件来源”，而不是特殊链路。

### E. 任何“先保留旧流，等以后再切”的长期双轨策略

如果已经决定采用方案 4，就不应该留下长期双轨：

- run stream 一套
- session stream 一套
- 以后慢慢再迁移

这种做法极易变成永久债务。

本次应优先争取一次性切干净。

## 可以接受的临时保留项

只有在下面两个条件同时满足时，才允许临时保留：

1. 不会形成第二真相源
2. 明确只服务于本次切换过程，完成后立即可删

也就是说：

- 临时保留只能是迁移脚手架
- 不能是长期兼容层

如果某个“临时层”会让系统长期维持双语义，它就不应该被保留。

## 新架构下的接口语义

### `/send`

新语义：

- 只负责提交一轮 request
- 返回 ack 或轻量确认即可
- 不再承担独立实时输出职责

### `/stream`

新语义：

- 唯一 session 级实时订阅入口
- 只按 `sessionId` 订阅
- 任何属于该 session 的状态变化都必须从这里可见

### backend 内部

新语义：

- 任何会修改 session 观察状态的动作，都必须写入同一个 session event stream
- run 内事件与 run 外异步事件，不得再走分叉对外流

## 一次性实现时的建议顺序

### 第 1 步：先定义最终真相源

先把 backend 内部的唯一 session stream 边界定义清楚：

- 谁拥有它
- 谁负责 publish
- 谁可以消费

在这一步之前，不要先改前端，不要先补兼容。

### 第 2 步：让所有事件都流经 session stream

确保以下事件统一进入同一流：

- run started / finished / error
- text delta / reasoning / tool lifecycle
- `updateToolCallResult`
- `appendMessage`
- abort
- source session resume 后续事件

### 第 3 步：取消 `/stream` 对 run-level 私有流的依赖

做到：

- `/stream` 只订阅 session stream
- 不再关心当前是否存在 active execution 私有通道

### 第 4 步：把 `/send` 降级为提交接口

这一阶段才做协议语义切换：

- 前端不再把 `/send` 当成实时流消费来源
- 前端只用 `/stream` 接收实时事件

### 第 5 步：最后删兼容层

包括：

- run-level 对外 publisher
- replay/追平补偿层
- `sessions_request` 特殊桥接
- 任何双轨监听逻辑

## 实现时的强约束

### 不允许做的事

- 不允许给 `sessions_request` 单独加事件特判
- 不允许先做前端补丁止血
- 不允许保留长期双轨结构
- 不允许用 replay 机制冒充最终方案
- 不允许为了“平滑过渡”保留第二真相源

### 必须做到的事

- 必须能明确说清楚：最终系统里只有一个 session 级实时真相源
- 必须能明确说清楚：`sessions_request` 不再拥有任何专属同步机制
- 必须能明确说清楚：刷新与不刷新，看到的是同一套事实，只是观察时机不同

## 验证标准

最终实现完成后，至少要满足以下验收：

1. 普通 run 内工具状态在当前页面实时正确。
2. `sessions_request` 在普通会话场景下，目标完成后当前页面无需刷新即可从 `running` 进入 `completed`。
3. child session 场景不回归。
4. 刷新前后状态一致，不再依赖“刷新修正实时错误”。
5. `/stream` 的语义可以用一句话清晰定义：
   - “它订阅的是 session 的实时状态变化”
6. 系统内部不再存在两个并列的对外实时事实来源。

## 本次文档的最终决策

最终决策如下：

- 本次不采用前端补救方案
- 本次不采用 replay/补追作为最终架构
- 本次不采用保留双通道的中间长期方案
- 本次直接采用方案 4：单一 `session stream` 架构

同时明确采用更激进的删除策略：

- 宁可多删
- 宁可重建
- 不留下半旧半新的残留结构

因为从长期维护成本看，技术债远比重写代价更高。

## 下一步动作

下一步不是继续讨论“是否要补一个事件”，而是直接进入一次性实现准备。

实现时应以这份文档为主约束，围绕以下问题展开：

1. backend 中哪个对象应成为唯一 session stream owner
2. `/send` 如何改为纯提交接口
3. `/stream` 如何改为唯一实时消费入口
4. 哪些旧 publisher / 兼容层可以在第一轮实现中直接删掉
5. 如何用最少的新代码完成整轮切换

本次实现目标不是“尽量少动”，而是：

**在一次性切换中，让架构真正变简单。**
