# NextClaw Service-Native Remote Access Design

## 1. 背景与判断

当前 `nextclaw remote connect` 的实现可以证明 remote access MVP 可用，但它仍然停留在“前台 connector 命令”阶段。这个形态有三个长期问题：

1. 它把 remote 生命周期放在独立前台进程里，天然偏离 `nextclaw start/stop/status` 的主服务模型。
2. 它会把远程接入能力逼成第二套运行链路，后续一旦继续堆功能，配置、状态、日志、重连、故障排查都会分叉。
3. 它的用户心智不对。用户要的不是“再开一个 remote 终端”，而是“我的本地 NextClaw 服务天然可以被我自己远程接入”。

因此，长期最佳方案不是继续强化 `remote connect` 本身，也不是额外引入新的 remote daemon，而是把 remote connector 直接并入现有 NextClaw 主服务，让 remote 成为主服务的一个内建能力。

本方案的核心判断是：

- 业务能力仍然只有一套：本地 NextClaw UI / API。
- remote 只是这一套本地能力的受控远程入口，不是第二套业务系统。
- 平台只负责账号、设备、票据、relay 和设备状态，不承载本地业务执行。
- CLI 只负责启停、配置和诊断，不再承担长期驻留的主路径。

这条路线同时满足产品价值、架构收敛和长期维护性。

## 2. 设计目标

### 2.1 目标

- 让用户把 NextClaw 当作“自己的私有 AI 工作站”，启动一次本地服务后即可从其他设备访问。
- remote 默认纳入现有 service 生命周期，由 `nextclaw start/stop/restart/status` 统一管理。
- 保持远程接入链路可插拔、分层清晰，不把 remote 逻辑散落到 UI、CLI、server 多处。
- 保持本地 UI / API 为唯一业务入口，禁止 remote 再复制一套 controller / route / auth 体系。
- 支持未来扩展：
  - 多 relay provider
  - 多认证方式
  - 多设备状态视图
  - 更细粒度权限

### 2.2 非目标

- 不做云端托管执行。
- 不把聊天、会话、插件执行迁移到 platform backend。
- 不为了“可插拔”而引入重量级插件框架。
- 不新增第二套 remote 独立 service 管理系统。

## 3. 核心原则

### 3.1 Service-Native

remote connector 作为 NextClaw 主服务的一个 capability 挂载到 service host 中，而不是一个长期独立命令。

### 3.2 Single Business Surface

远程访问永远复用本地已有 UI / API。remote 只负责 transport、session bridge、鉴权桥接、状态汇报。

### 3.3 可插拔但不抽象过度

只抽象真正会变化的边界：

- relay 连接器
- 平台认证票据提供者
- 设备注册与状态持久化
- 本地请求转发器

不抽象不会变化的核心：

- 本地 UI / API 路由
- service lifecycle
- 配置主入口

### 3.4 单一状态源

remote 的启用状态、最近连接状态、设备 ID、平台地址等都进入现有 service 状态体系，避免 CLI 内部单独再维护一套影子状态。

### 3.5 默认安全

- 不在日志里输出完整 bearer token 或 websocket token
- connector 启动时换取短期连接票据
- 本地 bridge secret 只用于本机回环访问，不跨进程传播到用户侧

## 4. 目标产品形态

长期主用法应变成：

```bash
nextclaw login
nextclaw remote enable
nextclaw start
```

此后用户在平台网页或另一台设备上登录同一账号，就可以看到当前设备在线，并打开这台本地 NextClaw。

日常命令应收敛为：

- `nextclaw remote enable`
- `nextclaw remote disable`
- `nextclaw remote status`
- `nextclaw remote doctor`
- `nextclaw remote connect`

其中：

- `enable/disable/status/doctor` 是正式产品命令
- `connect` 保留为前台调试命令，不再作为主路径

用户体验目标：

1. 用户只需要理解“remote 是本地服务的一部分”。
2. 启用后，不需要单独保持一个终端窗口。
3. `nextclaw status` 能一眼看到 remote 是否启用、是否已连接、最近错误是什么。
4. 平台页面能显示设备在线状态、最后心跳、设备名、NextClaw 版本。

## 5. 目标架构

### 5.1 总体结构

```text
CLI Facade
  -> Service Manager
    -> NextClaw Service Host
      -> UI/API Server
      -> Remote Access Module
         -> Device Registry Adapter
         -> Session Ticket Provider
         -> Relay Connector
         -> Local Bridge Proxy
         -> Remote Status Store
```

### 5.2 模块分层

#### A. CLI Facade

职责：

- 接收 `remote enable/disable/status/doctor/connect`
- 修改配置
- 调用 service manager
- 打印用户可理解的状态

禁止职责：

- 不持有长期 remote 生命周期
- 不直接实现 websocket 主循环

#### B. Service Manager

职责：

- 统一托管本地服务进程
- 与现有 `start/stop/restart/status` 融合
- 在 service 启动后按配置决定是否激活 remote module

禁止职责：

- 不处理 remote 业务协议细节

#### C. Remote Access Module

这是长期 remote 的核心能力边界。它应作为一个内聚模块被 service host 挂载。

职责：

- 启动和关闭 remote connector
- 注册设备
- 获取短期连接票据
- 建立 websocket relay
- 接收远程 frame 并转发到本地 UI/API
- 汇报状态、错误和最近心跳

#### D. Local Bridge Proxy

职责：

- 代表远程会话访问本地 UI/API
- 负责本地认证桥接
- 统一 HTTP / SSE / 未来 WebSocket 隧道的本地转发入口

这层应继续依赖本地已有 server，不新开一套 remote controller。

## 6. 可插拔边界设计

这里的重点不是“做成插件系统”，而是把未来会变化的点隔离成稳定接口。

### 6.1 RelayTransport

```ts
interface RelayTransport {
  connect(params: RemoteConnectParams): Promise<RelayConnection>;
}
```

用途：

- 当前默认实现：Cloudflare relay websocket
- 未来可替换：自建 relay、企业专线 relay、局域网直连 relay

收益：

- remote 主模块不依赖具体 ws URL 拼接细节
- 平台迁移时，不用改 service lifecycle

### 6.2 DeviceRegistry

```ts
interface DeviceRegistry {
  ensureDeviceIdentity(): Promise<DeviceIdentity>;
  registerRemoteDevice(input: RegisterDeviceInput): Promise<RegisteredDevice>;
  revokeRemoteDevice(deviceId: string): Promise<void>;
}
```

用途：

- 管理本机 install identity
- 管理平台设备注册
- 支持未来设备重命名、吊销、迁移

### 6.3 SessionTokenProvider

```ts
interface SessionTokenProvider {
  getRelayTicket(deviceId: string): Promise<RelayTicket>;
}
```

用途：

- 当前 bearer token 不应直接出现在最终 ws URL 日志和长期状态中
- 长期改为 refresh credential 换短期 relay ticket

### 6.4 LocalRequestForwarder

```ts
interface LocalRequestForwarder {
  forward(frame: RemoteRequestFrame): Promise<RemoteResponseFrame | RemoteStreamHandle>;
}
```

用途：

- 把 HTTP/SSE/未来 WebSocket 的本地转发统一封装
- remote module 不感知 Hono 路由细节

### 6.5 RemoteStatusStore

```ts
interface RemoteStatusStore {
  load(): Promise<RemoteRuntimeStatus>;
  update(patch: Partial<RemoteRuntimeStatus>): Promise<void>;
}
```

用途：

- 把 remote 在线状态、最近错误、最近连接时间、设备信息沉淀到统一状态源
- `nextclaw status` 和 `nextclaw remote status` 都读这份状态

## 7. 配置设计

建议在主配置里加入独立 `remote` 块：

```json
{
  "remote": {
    "enabled": true,
    "deviceName": "PeideMacBook-Pro",
    "platformApiBase": "https://ai-gateway-api.nextclaw.io/v1",
    "relayMode": "platform",
    "autoReconnect": true,
    "exposeLocalOrigin": "auto"
  }
}
```

字段解释：

- `enabled`
  - 是否随主服务启动 remote module
- `deviceName`
  - 平台设备展示名
- `platformApiBase`
  - 平台 API 地址
- `relayMode`
  - 预留扩展位，当前默认 `platform`
- `autoReconnect`
  - 是否在 service 内自动重连
- `exposeLocalOrigin`
  - 未来可扩展为 `auto/manual`

原则：

- remote 配置属于主配置，不另起独立配置文件
- 设备运行态状态不塞进 config，而是放到运行时状态文件

## 8. CLI 收敛方案

### 8.1 命令定义

#### `nextclaw remote enable`

- 写入 `remote.enabled=true`
- 如果 service 已在运行，则通知 service 热启 remote module

#### `nextclaw remote disable`

- 写入 `remote.enabled=false`
- 如果 service 已在运行，则优雅关闭 remote connector

#### `nextclaw remote status`

- 输出：
  - enabled / disabled
  - connected / connecting / disconnected / error
  - deviceId
  - deviceName
  - platform
  - lastConnectedAt
  - lastError

#### `nextclaw remote doctor`

- 检查：
  - 本地 UI 健康
  - token 是否可用
  - 设备是否已注册
  - relay ticket 是否可获取
  - websocket 是否可连接

#### `nextclaw remote connect`

- 保留为前台调试命令
- 明确标注为 debug / foreground mode

### 8.2 命令与 service 的关系

- 正式长期用户路径：`remote enable + start`
- 调试路径：`remote connect`

这样可以保留 MVP 价值，同时避免主入口继续绑在前台命令上。

## 9. 生命周期设计

### 9.1 启动

1. `nextclaw start` 启动本地 service host
2. service host 拉起本地 UI/API
3. 读取 `remote.enabled`
4. 若启用，则启动 remote module
5. remote module 执行：
   - 检查本地 UI 健康
   - 获取设备 identity
   - 注册/刷新设备
   - 获取 relay ticket
   - 建立 websocket

### 9.2 运行中

- ping / pong 心跳
- 自动重连
- 状态回写到 runtime status store
- 用户可通过 `status` 查看

### 9.3 停止

1. `nextclaw stop`
2. service manager 通知 remote module 关闭
3. remote module 停止接收新请求
4. 优雅关闭 websocket
5. 状态标记为 offline / stopped

### 9.4 崩溃恢复

- 崩溃恢复仍由现有 service 托管机制负责
- remote module 不自己再造第二套崩溃拉起逻辑

## 10. 认证与安全设计

长期最佳方案应从“长期 bearer token 直接进 ws URL”升级到“短期票据模型”。

### 10.1 建议认证模型

1. CLI 通过网页登录或 device flow 完成账号授权
2. 本地保存长期 device credential / refresh credential
3. remote module 启动时向平台换取短期 relay ticket
4. websocket 只使用短期 ticket 建链

### 10.2 日志安全

必须修正当前日志策略：

- 日志中禁止打印完整 ws URL 中的 token
- 最多只打印脱敏后的 deviceId、platform host、ticket 前 6 位

### 10.3 本地桥接

本地 bridge 继续只允许回环访问，不开放给外部网络。其 secret 应只在本地服务内部消费，不暴露给用户界面或远程浏览器。

## 11. 平台职责边界

平台层长期只负责四类能力：

1. 账号与授权
2. 设备注册与设备状态
3. relay ticket 签发
4. relay 数据转发

平台层不负责：

- 运行本地插件
- 运行本地 agent loop
- 直接修改本地工作区
- 复制一套本地 UI 业务逻辑

这样能确保 remote 仍然是“本地服务的远程入口”，不是“云端替身”。

## 12. 迁移路径

### Phase 1: 命令收敛

- 新增 `remote enable/disable/status/doctor`
- `remote connect` 标注为 foreground debug mode

### Phase 2: service 内建 remote module

- 把 `RemoteCommands.connect()` 的核心连接循环迁入 service host
- CLI 只负责调用 service manager

### Phase 3: 状态统一

- remote 状态写入统一 runtime status store
- `nextclaw status` 聚合显示 remote 状态

### Phase 4: 安全升级

- bearer token -> relay ticket
- 日志脱敏
- 设备授权续期

### Phase 5: 传输扩展

- 在不改主服务模型的前提下，扩展 WebSocket tunnel / 其他 relay provider

## 13. 为什么这是“长期最佳”而不是“短期可用”

因为它同时解决了三个根问题：

1. 产品心智统一  
用户只需要理解“启动 NextClaw 服务后，远程入口也随之可用”。

2. 架构不会分叉  
remote 不会再长成第二套 daemon、第二套状态机、第二套运维入口。

3. 插拔边界清晰  
未来需要替换的是 relay、ticket、registry、forwarder，而不是整个 service 模型。

## 14. 验收标准

达到以下条件，说明长期方案落地成功：

1. 用户执行 `nextclaw remote enable && nextclaw start` 后，不再需要额外开一个终端保持 remote 在线。
2. `nextclaw status` 可以直接看到 remote 连接状态与最近错误。
3. 平台能够稳定显示设备在线状态，并打开本地 UI。
4. CLI 日志不再输出完整 token。
5. remote 代码在仓库中的边界清晰：
   - service host 负责生命周期
   - remote module 负责连接与转发
   - server 继续只提供本地 UI/API 与 bridge
   - CLI 只负责入口与配置
6. 后续替换 relay provider 时，不需要重写 service manager、UI router、主配置模型。

## 15. 最终建议

后续实现应严格围绕一句话推进：

**把 remote 从“前台命令”升级为“主服务内建能力”，并只对变化边界做最小必要抽象。**

这就是长期最佳路线，也是最能避免 NextClaw remote 子系统持续膨胀的路线。
