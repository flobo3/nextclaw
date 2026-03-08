# v0.12.49-platform-admin-no-signup-prod-minimum

## 迭代完成说明（改了什么）

- 去掉平台注册入口：
  - 删除后端 `POST /platform/auth/register`。
  - 用户前端登录页移除“注册并登录”入口，只保留登录。
  - 删除“首个注册用户自动 admin”路径（注册链路已不存在）。
- 管理后台生产最小可用补强：
  - 用户列表与充值审核列表支持 `cursor` 分页。
  - 用户列表支持邮箱搜索（`q`）。
  - 管理后台 UI 增加搜索 + 上一页/下一页控制。
- 账务与审计补强：
  - 新增 `audit_logs` 表，记录管理员关键操作（额度调整、充值审核、平台免费池上限变更）。
  - `chat` 计费链路支持 `X-Idempotency-Key` 并在账本层做 `request_id` 幂等防重。
  - 充值审核入账补偿逻辑：账本写入失败会回滚充值状态与余额改动。
- 数据库迁移：
  - 新增 `0003_platform_prod_minimum.sql`（审计表 + 分页索引 + request_id 唯一索引）。

## 测试/验证/验收方式

- 已执行并通过：
  - `pnpm validate:platform:mvp`
    - `workers/nextclaw-provider-gateway-api`：`build/lint/tsc`
    - `apps/platform-console`：`build/lint/tsc`
    - `apps/platform-admin`：`build/lint/tsc`
    - 自动冒烟：`pnpm smoke:platform:mvp`
- 冒烟覆盖：
  - 登录鉴权、管理权限校验
  - 充值申请 -> 管理员审核 -> 入账
  - 双额度拦截
  - 付费余额直扣
  - 账本不可变（DB trigger）

## 发布/部署方式

- 本地迁移：
  - `pnpm platform:db:migrate:local`
- 远程迁移（发布后端/数据库变更时必须执行）：
  - `pnpm platform:db:migrate:remote`
- 联调：
  - 用户站：`pnpm dev:platform:stack:migrate`
  - 管理站：`pnpm dev:platform:admin:stack:migrate`

## 用户/产品视角的验收步骤

1. 打开用户站登录页，确认没有注册入口，只能登录。
2. 用已有账号登录管理站，进入“用户额度管理”。
3. 在用户管理里按邮箱搜索用户，并翻页验证上一页/下一页。
4. 在充值审核里切换“待处理/全部”，并翻页验证数据可继续加载。
5. 进行一次充值审核通过，确认用户余额变化，并可在后台审计日志（数据库）追溯操作人和动作。
