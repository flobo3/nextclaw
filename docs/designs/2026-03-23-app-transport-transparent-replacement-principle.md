# App Transport Transparent Replacement Principle

日期：2026-03-23

## 1. 背景

`AppTransport` / `appClient` 的引入，不只是为了把 remote access 的高频请求收口到一条长连接上，更关键的是要保证这层替换对上层业务真正无感。

这里的“无感”不是“多数情况下看起来能跑”，而是：

- 替换前后，上层业务代码的行为语义保持一致。
- transport 只负责传输，不负责理解 chat / NCP / future protocol 的业务终止语义。
- remote adaptor 不能偷偷添加本地模式没有的附加规则，也不能删减本地模式已经存在的事件语义。

如果 transport 为了“帮忙”理解上层协议，短期可能像是在修 bug，长期一定会破坏边界，让 remote 与 local 行为漂移。

## 2. Primary Contract

`appClient` 的 primary contract 只有三类能力：

- `request()`：一次性请求-响应
- `openStream()`：按事件顺序透传流式事件，并提供 `finished`
- `subscribe()`：订阅应用级实时事件

这层 contract 表达的是应用通信原语，而不是业务协议解释器。

因此：

- `AppTransport` 可以知道“这是 request / stream / event”
- `AppTransport` 不可以知道“这是 NCP 的 run.finished / chat 的 final / 某个 future SSE 的 terminal event”

## 3. 什么叫透明替换

透明替换必须同时满足下面四条：

1. 上层调用方式不变

- 业务层继续调用 `appClient.request/openStream/subscribe`
- 页面、hooks、manager、store、presenter 不需要因为 local / remote 切换而改写

2. 事件面保持一致

- 本地模式看到什么 SSE 事件，remote 模式也必须看到同样的 SSE 事件
- transport 不能丢事件、合并事件、改写业务事件名

3. 结束语义保持一致

- stream 结束时，local 与 remote 必须对 `finished` 给出同样结果
- 但“什么事件意味着业务完成”必须由上层协议自己解释，不能由 transport 猜

4. 错误语义保持一致

- transport 只负责传输级错误，例如连接关闭、HTTP 非 2xx、socket 断开
- 业务级 `error` 事件仍然是普通流事件，必须透传给上层自行决定如何处理

## 4. Transport 允许做什么

transport / adaptor 允许做的事情只有：

- 把 HTTP 映射成 `request`
- 把 SSE 映射成按序 `stream.event`
- 把 WebSocket 应用事件映射成 `subscribe`
- 做连接建立、断线重连、取消、超时、远程 session 建立
- 在 remote 模式下把多条业务流多路复用到单条 WebSocket
- 维护 `openStream().finished` 的 transport 级返回值

这里最后一条需要特别说明：

- `finished` 是 `appClient` 自己的固定 API contract
- 它不是某个具体业务协议的 contract
- 对当前实现来说，literal `final` SSE frame 的 payload 会成为 `finished` 的结果；若没有 `final`，则 `finished` 允许得到 `undefined`

这属于 `appClient` 自己的公共流 contract，不属于对 chat / NCP 等业务协议的越界理解。

## 5. Transport 严禁做什么

下面这些都属于违反透明替换原则：

- 根据上层业务事件名列表推断“正常结束”
- 根据业务 payload type 推断“terminal event”
- 在 remote adaptor 中把某个业务事件折叠成单独的结束结果，再不透传原始事件
- 看到 `error` SSE 事件就直接当成 transport error 抛出，而不是先透传给上层
- 因为某个上层协议当前长这样，就把这种结构编码进 transport 公共层
- 为了兼容局部问题，在 transport 里增加业务特例、协议白名单、事件黑名单

一句话：

**transport 只替换传输方式，不替换上层协议解释器。**

## 6. 本次修正的边界回归

本次修正的核心不是继续补 terminal event case，而是把错误边界撤回去：

1. SSE 读取层不再依赖业务 terminal 配置

- 删除 `terminalEventNames`
- 删除 `terminalEventPayloadTypes`
- 不再因为没有 `final` 就在 transport 层抛 `stream ended without final event`

2. remote adaptor 不再消费业务 SSE 语义

- `client.stream.event` 只承载原始 SSE 事件
- `client.stream.end` 只表示 transport EOF
- `stream.end` 不再携带业务结果

3. 上层协议自己解释 `final/error`

- chat stream 自己处理 `final`
- NCP endpoint 自己处理 `final/error`
- transport 只负责把事件按顺序送到上层

## 7. 设计检查清单

以后凡是改 `appClient` / `AppTransport` / local / remote adaptor，都必须先过这份检查：

1. 这个改动是不是在让 transport 理解某个具体业务协议？
2. 如果去掉当前业务名称，transport 逻辑还成立吗？
3. local 和 remote 是否还能看到完全一致的原始流事件？
4. transport 是否引入了新的“隐式成功”或“隐式失败”？
5. 如果未来接入另一种 SSE 协议，这层是否仍然无需新增业务特例？

只要其中任一项答案是否定的，就说明边界又被破坏了。

## 8. 验证标准

验证必须同时覆盖三层：

### 8.1 单元/类型层

- `@nextclaw/ui` 的 stream routing / SSE parsing 测试通过
- `@nextclaw/ui` / `@nextclaw/remote` / `nextclaw-provider-gateway-api` 类型检查通过

### 8.2 本地真实实例

- 本地 `pnpm dev start` 或等效本地实例能正常对话
- 回复完成后前端不再报 `stream ended without final event`
- 回复完成后刚发送的消息与 AI 回复不会从当前视图消失
- 输入框不会被刚发出去的内容错误回填

### 8.3 remote transport contract

- request 通过 multiplex 正常返回
- stream 事件按原样透传
- `final` 仍以 `stream.event` 形式存在
- `stream.end` 只表示 transport EOF，不夹带业务结果

## 9. 结论

这条原则是 `appClient` / `AppTransport` 是否成立的根约束，不是实现细节偏好。

只要我们坚持：

- 业务走 `appClient`
- transport 只做传输
- 上层协议自己解释业务事件

那么未来不管底层从 HTTP/SSE/WS 换到 multiplex WebSocket、WebTransport 还是 WebRTC，都可以做到真正无感替换。
