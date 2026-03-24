# v0.14.158 Remote Quota Minimal Model

本次技术方案文档：[`docs/plans/2026-03-24-remote-quota-minimal-model-design.md`](/Users/peiwang/Projects/nextbot/docs/plans/2026-03-24-remote-quota-minimal-model-design.md)

## 迭代完成说明

- 将 remote quota 模型从多层重叠限制收敛为最小四规则：
  - 保留 `session` 每分钟请求限流
  - 保留 `user` 每日预算
  - 保留 `platform` 每日总预算
  - 浏览器并发只保留“单 instance 连接上限”
- 删除以下不再需要的 quota 维度：
  - `user` 每分钟请求限流
  - `user` 浏览器连接上限
  - `session` 浏览器连接上限
  - `session` 每日 Worker / DO 预算
- 调整 quota state 结构：
  - `user` 维度只保留 daily usage
  - `session` 维度只保留 request window
  - instance 连接上限改为跨全平台用户聚合统计，而不是按单用户局部统计
- 将 `REMOTE_QUOTA_INSTANCE_CONNECTIONS` 默认值从 `4` 提升到 `100`，同时允许配置上探到 `10000`。
- 同步重写 quota 策略测试，锁定“旧限制已删除、新限制仍然有效”的行为边界。

## 测试/验证/验收方式

- 构建：`pnpm -C workers/nextclaw-provider-gateway-api build`
- Lint：`pnpm -C workers/nextclaw-provider-gateway-api lint`
- 类型检查：`pnpm -C workers/nextclaw-provider-gateway-api tsc`
- quota 策略测试：`pnpm -C workers/nextclaw-provider-gateway-api test:quota`
- 可维护性检查：`node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths workers/nextclaw-provider-gateway-api/src/remote-quota-contract.ts workers/nextclaw-provider-gateway-api/src/remote-quota-budget-support.ts workers/nextclaw-provider-gateway-api/src/remote-quota-state-support.ts workers/nextclaw-provider-gateway-api/src/remote-quota-policy.ts workers/nextclaw-provider-gateway-api/src/remote-quota-do.ts workers/nextclaw-provider-gateway-api/src/services/remote-quota-guard.service.ts workers/nextclaw-provider-gateway-api/tests/remote-quota-policy.test.mjs`
- 线上最小冒烟：
  - `curl -sS https://ai-gateway-api.nextclaw.io/health`
  - 返回：`{"ok":true,"data":{"status":"ok","service":"nextclaw-provider-gateway-api","authRequired":true,"billingMode":"usd-only"}}`

自动化测试覆盖：

- `session` 分钟级请求限流
- 单 instance 浏览器连接上限
- `platform` worker daily budget
- `platform` durable object daily budget
- `user` worker daily budget
- `user` durable object daily budget
- ws message lease 批量发放
- browser connect 自身也受 `user daily budget` 约束

## 发布/部署方式

- 本次不涉及 D1 schema 变更，`platform:db:migrate:remote` 不适用。
- 发布命令：`pnpm -C workers/nextclaw-provider-gateway-api run deploy`
- 发布后检查 deploy 输出，确认以下绑定与环境变量生效：
  - `NEXTCLAW_REMOTE_RELAY`
  - `NEXTCLAW_REMOTE_QUOTA`
  - `REMOTE_QUOTA_SESSION_REQUESTS_PER_MINUTE`
  - `REMOTE_QUOTA_INSTANCE_CONNECTIONS`
  - `REMOTE_QUOTA_USER_DAILY_WORKER_REQUEST_UNITS`
  - `REMOTE_QUOTA_USER_DAILY_DO_REQUEST_UNITS`
- 本次实际发布结果：
  - Route：`ai-gateway-api.nextclaw.io` / `*.claw.cool/*`
  - Current Version ID：`4ba3c8d6-9502-4204-b255-9d6073bcde98`
- 文档影响检查：
  - 公共使用文档中没有维护这些内部 quota 数值入口，本次无需同步修改用户文档；设计与迭代留痕已补齐。

## 用户/产品视角的验收步骤

1. 登录 remote access 并打开单个实例，确认正常页面加载、基础请求和流式输出仍可工作。
2. 在同一个 remote session 内持续高频触发请求，确认超过分钟窗口后收到明确限流，而不是无响应或随机失败。
3. 用多个浏览器窗口或多用户同时连接同一个 instance，确认在达到 instance 上限前仍可稳定接入，超过上限后收到明确拒绝。
4. 单个用户在多个 session 之间切换使用时，不应再因为旧的 `user RPM / user connection / session connection / session daily` 规则被提前误伤。
