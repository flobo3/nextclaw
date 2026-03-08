# v0.12.50-auth-rate-limit-lockout-minimum

## 迭代完成说明（改了什么）

- 在已移除注册入口的基础上，新增登录安全最小闭环：
  - 登录失败账号锁定：同一账号连续失败 5 次，锁定 15 分钟。
  - 登录失败 IP 限流：同一 IP 在 10 分钟内失败达到 30 次后返回 `429`。
  - 强密钥校验：`AUTH_TOKEN_SECRET` 长度不足 32 时拒绝鉴权服务。
- 数据库新增：
  - `user_security`：记录失败次数与锁定截止时间。
  - `login_attempts`：记录登录尝试（含成功/失败、原因、IP）。
  - migration：`0004_login-rate-limit-lockout.sql`。
- 冒烟脚本补强：
  - 增加“错误密码触发账号锁定（423）”自动验证。

## 测试/验证/验收方式

- 已执行并通过：
  - `pnpm validate:platform:mvp`
  - 包含：worker + user/admin 前端 `build/lint/tsc` + `smoke:platform:mvp`
- 新增验证点：
  - 连续错误密码登录，前 4 次 `401`，第 5 次 `423 ACCOUNT_LOCKED`
  - 其余既有能力（充值审核、双额度、账本不可变等）回归通过

## 发布/部署方式

- 本地迁移：
  - `pnpm platform:db:migrate:local`
- 远程迁移（后端/数据库发布必须执行）：
  - `pnpm platform:db:migrate:remote`
- 联调：
  - 用户站：`pnpm dev:platform:stack:migrate`
  - 管理站：`pnpm dev:platform:admin:stack:migrate`

## 用户/产品视角的验收步骤

1. 使用错误密码连续登录同一账号 5 次，确认第 5 次返回账号锁定提示。
2. 使用正确密码登录未锁定账号，确认可正常进入用户/管理站。
3. 验证管理台分页搜索、充值审核、额度调整流程仍可正常使用。
