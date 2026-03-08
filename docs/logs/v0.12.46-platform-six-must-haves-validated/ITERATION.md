# v0.12.46-platform-six-must-haves-validated

## 迭代完成说明（改了什么）

- 对齐并交付平台最小必需 6 项能力：
  - 登录鉴权：用户站必须登录，管理站独立站点且仅 `admin` 角色可访问管理能力。
  - 双额度硬拦截：每次请求同时检查“用户个人免费额度 + 平台总免费池额度”，任一耗尽即免费不可用。
  - 付费余额直扣：不做 credits 换算，按 USD 直接结算/扣费。
  - 账本不可变：新增 D1 migration，数据库层禁止 `usage_ledger` 的 `UPDATE/DELETE`。
  - 充值最小闭环：用户创建充值申请，管理员审核通过后入账并写账本流水。
  - 后台最小能力：平台总览、用户额度管理（免费额度上限 + 付费余额增减）、充值审核。
- 代码改动：
  - 管理后台额度管理 UI 升级（支持按用户编辑免费额度上限与付费余额增减）。
  - 新增 `workers/nextclaw-provider-gateway-api/migrations/0002_usage_ledger_immutable.sql`。
  - 新增根目录自动冒烟脚本 `scripts/platform-mvp-smoke.mjs`。
  - 新增根命令：
    - `pnpm smoke:platform:mvp`
    - `pnpm validate:platform:mvp`

## 测试/验证/验收方式

- 一键全量验证（本次已执行通过）：
  - `pnpm validate:platform:mvp`
- 冒烟覆盖点（自动化）：
  - 未登录访问受保护接口返回 `401`
  - 普通用户访问管理接口返回 `403`
  - 充值申请创建 + 管理员审核通过 + 用户余额入账成功
  - 双免费额度硬拦截：全局免费池耗尽且余额不足时，`/v1/chat/completions` 返回 `429 insufficient_quota`
  - 付费余额直扣：免费额度不可用时，调用成功后付费余额下降、账本出现 `usage_paid`
  - 账本不可变：直接对 `usage_ledger` 执行 `UPDATE` 被数据库触发器拒绝

## 发布/部署方式

- 本地数据库：
  - `pnpm platform:db:migrate:local`
- 远程数据库（发布涉及后端/DB 时必须执行）：
  - `pnpm platform:db:migrate:remote`
- 本地联调：
  - 用户站联调：`pnpm dev:platform:stack:migrate`
  - 管理站联调：`pnpm dev:platform:admin:stack:migrate`

## 用户/产品视角的验收步骤

1. 执行 `pnpm dev:platform:stack:migrate`，打开用户站，确认必须登录后才能看到账单与充值页面。
2. 执行 `pnpm dev:platform:admin:stack:migrate`，打开独立管理站，使用管理员账号登录。
3. 在用户站提交一笔充值申请，在管理站审核通过，回到用户站确认余额增长且流水可见。
4. 在管理站将全局免费池设为 `0`，并让测试用户余额为 `0`，调用 `/v1/chat/completions` 应返回 `429`。
5. 给测试用户增加付费余额，再次调用 `/v1/chat/completions`，应成功且余额减少、流水新增 `usage_paid`。
