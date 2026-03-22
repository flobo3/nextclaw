# v0.14.112 NextClaw Platform Password Login And Verified Registration

## 迭代完成说明

- 将 `NextClaw Account` 模型从“邮箱验证码即登录/自动建号”收口为正式账号体系：
  - 登录：邮箱 + 密码
  - 注册：邮箱验证码验证后设置密码
  - 忘记密码：邮箱验证码验证后设置新密码
- 后端新增正式接口：
  - `POST /platform/auth/register/send-code`
  - `POST /platform/auth/register/complete`
  - `POST /platform/auth/password/reset/send-code`
  - `POST /platform/auth/password/reset/complete`
- 浏览器设备授权页同步收口为三态：
  - 密码登录授权
  - 邮箱验证码注册后授权
  - 邮箱验证码重置密码后授权
- 新增数据库迁移 [`0009_platform_email_auth_purpose_refresh.sql`](../../../workers/nextclaw-provider-gateway-api/migrations/0009_platform_email_auth_purpose_refresh.sql)，清理旧 OTP purpose 约束并切到新账号模型。
- 平台登录页改为 `登录 / 注册 / 忘记密码` 三入口，不再向用户暴露“验证码登录”错误心智。
- 本地平台冒烟脚本同步切到“注册验证码 + 密码登录 + 密码重置”正式链路。

## 测试 / 验证 / 验收方式

- `pnpm -C workers/nextclaw-provider-gateway-api tsc`
- `pnpm -C workers/nextclaw-provider-gateway-api build`
- `pnpm -C workers/nextclaw-provider-gateway-api lint`
- `pnpm -C apps/platform-console tsc`
- `pnpm -C apps/platform-console build`
- `pnpm -C apps/platform-console lint`
- `node scripts/platform-mvp-smoke.mjs`
- 冒烟结果：
  - 通过，覆盖管理员密码登录、普通用户验证码注册、密码登录、密码重置、登录锁定、权限检查、充值申请、额度扣减和 ledger 不可变约束。

## 发布 / 部署方式

- 数据库迁移：
  - `pnpm -C workers/nextclaw-provider-gateway-api db:migrate:remote`
- 后端部署：
  - `pnpm -C workers/nextclaw-provider-gateway-api deploy`
- 平台前端发布：
  - 根目录执行 `pnpm deploy:platform:console`
- 发布前要求：
  - `mail.nextclaw.io` 已在 Resend 中 `verified`
  - 生产 worker 已配置 `PLATFORM_AUTH_EMAIL_PROVIDER=resend`
  - 生产 worker 已配置 `PLATFORM_AUTH_EMAIL_FROM`
  - 生产 worker 已配置 `RESEND_API_KEY`

## 用户 / 产品视角的验收步骤

- 打开 `platform.nextclaw.io`
- 默认应看到“登录 / 注册 / 忘记密码”三个入口，而不是“验证码直接登录”
- 在“注册”里输入新邮箱，收到验证码后设置密码，成功进入平台
- 退出后回到“登录”，使用同一邮箱 + 密码重新登录，必须成功
- 在“忘记密码”里对同一邮箱收验证码，设置新密码后重新登录，必须成功
- 从本地 NextClaw 发起浏览器设备授权：
  - 已有账号应可通过密码直接授权设备
  - 新账号应可在授权页完成邮箱验证注册并授权设备
  - 忘记密码用户应可在授权页重置密码并授权设备

## 相关记录

- 前一阶段的验证码账号尝试见 [`v0.14.109`](../v0.14.109-nextclaw-platform-account-email-code-auth/README.md)
- 生产邮件配置准备见 [`v0.14.110`](../v0.14.110-nextclaw-platform-resend-production-preflight/README.md)
