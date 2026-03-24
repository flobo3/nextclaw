# NextClaw Remote Quota Minimal Model Design

## 背景

当前 remote quota 模型已经具备平台保护能力，但规则维度过多：

- `user` 分钟级请求限流
- `session` 分钟级请求限流
- `user` 浏览器连接上限
- `session` 浏览器连接上限
- `instance` 浏览器连接上限
- `user` 每日预算
- `session` 每日预算
- `platform` 每日预算

这套模型在工程上“安全”，但在产品上不够清晰。用户遇到拒绝时，很难理解自己到底撞到了哪条规则；同时，多层相近限制会把“短时间正常使用”也误判成异常流量。

本次目标不是继续补参数，而是把 remote quota 收敛成真正必要、用户可解释、平台也可保护的最小模型。

## 设计目标

1. 平台仍然能保护 Cloudflare Worker / Durable Object 的每日总预算。
2. 单用户不能长期占满全天预算。
3. 单个 remote session 的瞬时流量仍然要可控。
4. 浏览器长连接只保留一个真正必要的并发限制。
5. 删除不必要的中间层规则，减少“没用多久就被限死”的体验。

## 建议方案

采用“最小四规则模型”：

- 保留 `session` 每分钟请求限流
- 保留 `user` 每日预算
- 保留 `platform` 每日总预算
- 连接数只保留“单 instance 浏览器连接上限”

明确删除：

- `user` 每分钟请求限流
- `user` 浏览器连接上限
- `session` 浏览器连接上限
- `session` 每日 Worker 预算
- `session` 每日 DO 预算

## 为什么这样收敛

### 1. `session` RPM 是唯一真正需要的瞬时流量保护

remote 真正容易出现尖峰的，是单个 session 在短时间内连续刷新、重放请求、重复发起流式操作。这个维度直接保留即可。

而 `user` RPM 会把“一个用户在多个 session 之间正常切换”也合并算进同一桶里，造成规则重叠和误伤，因此删除。

### 2. 每日公平性只保留到 `user`

平台需要避免一个用户把全天免费池吃光，所以 `user daily budget` 需要保留。

但 `session daily budget` 会把同一个用户的自然使用拆成多个更小桶，用户切换一次 session 就会更容易碰壁。这种保护对平台价值不高，对体验伤害更大，因此删除。

### 3. 长连接并发保护应该挂在热点资源层，不该挂在用户层

浏览器连接占用的是 relay / websocket / instance 级资源。真正容易被打爆的是某个 instance，而不是“用户总共有几个连接”。

因此只保留 `instance browser connection limit`。这能直接保护热点实例，同时避免同一用户跨实例使用时被低阈值误伤。

## 默认阈值

本次建议默认值：

- `REMOTE_QUOTA_SESSION_REQUESTS_PER_MINUTE = 180`
- `REMOTE_QUOTA_INSTANCE_CONNECTIONS = 100`
- `REMOTE_PLATFORM_DAILY_WORKER_REQUEST_BUDGET = 100000`
- `REMOTE_PLATFORM_DAILY_DO_REQUEST_BUDGET = 100000`
- `REMOTE_PLATFORM_DAILY_RESERVE_PERCENT = 20`
- `REMOTE_QUOTA_USER_DAILY_WORKER_REQUEST_UNITS = 1200`
- `REMOTE_QUOTA_USER_DAILY_DO_REQUEST_UNITS = 6000`
- `REMOTE_QUOTA_WS_MESSAGE_LEASE_SIZE = 10`

其中：

- `instance connections` 默认值从“保守保护”提升为“产品可用”，但仍保留硬上限。
- 配置解析允许 `instance connections` 最高到 `10000`，满足大规模实例共享场景的上探空间；但默认值不直接设成 `10000`，避免把保护规则变成名义存在。

## 数据模型变化

### 保留

- `platformDailyUsage`
- `users[userId].dailyUsage`
- `users[userId].browserConnections`
- `users[userId].sessions[sessionId].requestWindow`

### 删除

- `users[userId].requestWindow`
- `users[userId].sessions[sessionId].dailyUsage`

这样状态结构会更贴近真实规则：

- user 维度只保留“每日预算”
- session 维度只保留“分钟窗口”

## 错误契约

保留以下错误码：

- `REMOTE_SESSION_RATE_LIMITED`
- `REMOTE_INSTANCE_CONNECTION_LIMIT`
- `REMOTE_PLATFORM_WORKER_DAILY_BUDGET_EXCEEDED`
- `REMOTE_PLATFORM_DO_DAILY_BUDGET_EXCEEDED`
- `REMOTE_USER_DAILY_WORKER_BUDGET_EXCEEDED`
- `REMOTE_USER_DAILY_DO_BUDGET_EXCEEDED`
- `REMOTE_QUOTA_GUARD_UNAVAILABLE`

删除以下错误码：

- `REMOTE_USER_RATE_LIMITED`
- `REMOTE_USER_CONNECTION_LIMIT`
- `REMOTE_SESSION_CONNECTION_LIMIT`
- `REMOTE_SESSION_DAILY_WORKER_BUDGET_EXCEEDED`
- `REMOTE_SESSION_DAILY_DO_BUDGET_EXCEEDED`

## 实现影响

需要修改：

- `remote-quota-contract.ts`
- `remote-quota-policy.ts`
- `remote-quota-budget-support.ts`
- `remote-quota-state-support.ts`
- `remote-quota-do.ts`
- `types/platform.ts`
- `wrangler.toml`
- `tests/remote-quota-policy.test.mjs`

不需要修改：

- D1 schema
- remote auth / sharing 数据表
- relay lease 机制本身

## 验证计划

- 策略测试覆盖：
  - `session` 分钟级限流
  - 单 instance 浏览器连接上限
  - `platform` worker daily budget
  - `platform` DO daily budget
  - `user` worker daily budget
  - `user` DO daily budget
  - ws message lease 批量发放
  - browser connect 也会消耗并受 `user daily budget` 约束
- 执行：
  - `pnpm -C workers/nextclaw-provider-gateway-api build`
  - `pnpm -C workers/nextclaw-provider-gateway-api lint`
  - `pnpm -C workers/nextclaw-provider-gateway-api tsc`
  - `pnpm -C workers/nextclaw-provider-gateway-api test:quota`
- 发布：
  - `pnpm -C workers/nextclaw-provider-gateway-api run deploy`
- 线上验收：
  - `curl -sS https://ai-gateway-api.nextclaw.io/health`

## 取舍说明

这次不是把保护彻底放开，而是把保护明确收敛到：

- 能限制尖峰
- 能限制全天占用
- 能限制热点连接

除此之外，不再用多层重叠阈值制造 surprise failure。
