# v0.16.21-public-roadmap-portal-phase2

## 迭代完成说明

- 在 [`apps/public-roadmap-feedback-portal`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal) 完成第 2 期“真实官方数据底座”落地：
  - 新增 D1 migration：[`0001_public_roadmap_portal.sql`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/migrations/0001_public_roadmap_portal.sql)
  - 新增 live mode 运行时选择：[`portal-runtime.service.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/server/portal-runtime.service.ts)
  - 新增显式配置 owner：[`portal-config.service.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/server/portal-config.service.ts)
  - 新增 D1 repositories：
    - [`public-item.repository.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/server/repositories/public-item.repository.ts)
    - [`portal-source-link.repository.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/server/repositories/portal-source-link.repository.ts)
  - 新增 Linear provider：
    - [`linear-source.provider.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/server/providers/linear-source.provider.ts)
  - 新增显式同步入口：
    - `POST /internal/sync/linear`
- 这期把数据合同明确成：
  - `preview` 模式：读取仓库内 preview 数据
  - `live` 模式：只读 API 读取 D1，同步动作显式由内部接口触发
  - 不再依赖“有没有某个环境变量所以偷偷换行为”的隐式分支
- 新增脚本与部署合同：
  - `db:migrate:local`
  - `db:migrate:remote`
  - `wrangler.toml` 中增加 `PUBLIC_ROADMAP_PORTAL_DB` 绑定与 live mode 相关 vars
- 第一阶段的 preview UI、只读 API 和 smoke 继续保留，但已经从“只有 preview 数据”升级为“preview/live 双模式，且模式由显式配置决定”。

## 测试/验证/验收方式

- 已通过：
  - `pnpm build:public-roadmap:portal`
  - `pnpm lint:public-roadmap:portal`
  - `pnpm tsc:public-roadmap:portal`
  - `pnpm smoke:public-roadmap:portal`
  - `pnpm lint:new-code:governance -- apps/public-roadmap-feedback-portal`
- 本期未在当前会话中完成的验证：
  - 未执行真实 `db:migrate:local`
  - 未执行真实 `POST /internal/sync/linear`
  - 原因：当前会话未提供可用的 D1 实例与 Linear token / team key / internal token
- 额外说明：
  - 全仓 `pnpm lint:maintainability:guard` 仍会被工作区里与本任务无关的既有改动 `apps/docs/.vitepress/data/project-pulse.generated.mjs` 阻断；本次新增应用子树的 diff-only 治理检查已通过。

## 发布/部署方式

- 预览模式本地运行：
  - `pnpm dev:public-roadmap:portal`
- 本地构建：
  - `pnpm build:public-roadmap:portal`
- 初始化 D1：
  - `pnpm -C apps/public-roadmap-feedback-portal db:migrate:local`
  - `pnpm -C apps/public-roadmap-feedback-portal db:migrate:remote`
- 开启 live mode 前，需要提供：
  - `PUBLIC_ROADMAP_FEEDBACK_PORTAL_DATA_MODE=live`
  - `LINEAR_API_TOKEN`
  - `PUBLIC_ROADMAP_FEEDBACK_PORTAL_LINEAR_TEAM_KEY`
  - `PUBLIC_ROADMAP_FEEDBACK_PORTAL_INTERNAL_TOKEN`
  - `PUBLIC_ROADMAP_PORTAL_DB` 绑定
- 同步官方路线图：
  - 调用 `POST /internal/sync/linear`
  - 使用 `Authorization: Bearer <PUBLIC_ROADMAP_FEEDBACK_PORTAL_INTERNAL_TOKEN>` 或 `x-portal-internal-token`
- Cloudflare Worker 部署：
  - `pnpm deploy:public-roadmap:portal`
  - 部署前需把 `wrangler.toml` 中 D1 `database_id` 替换为真实值

## 用户/产品视角的验收步骤

1. 在默认 `preview` 模式下打开门户，用户仍然能看到首页、路线图、已交付和详情侧板，行为与第一期保持一致。
2. 把环境切到 `live` 并完成 D1 migration 后，调用 `/internal/sync/linear`。
3. 再访问 `GET /api/overview`、`GET /api/items`、`GET /api/updates` 时，返回的 `mode` 应为 `live`，并且数据来自同步后的 D1。
4. 若 `live` 模式缺失 D1 绑定或 Linear 配置，接口会明确报错，而不是悄悄退回 preview。

## 可维护性总结汇总

- 长期目标对齐 / 可维护性推进：
  - 这期不是简单把 preview 数据换成“能跑就行”的实时请求，而是把“公开路线图门户的数据底座”独立成明确合同：读路径负责观察，写路径只存在于显式同步动作里。
  - 这符合 NextClaw 作为统一入口的长期方向：同一个公开产品界面开始具备真实官方规划接入能力，但仍不把上游系统结构直接暴露给用户。
- 可维护性复核结论：通过
- 本次顺手减债：是
- 代码增减报告：
  - 新增：934 行
  - 删除：53 行
  - 净增：881 行
- 非测试代码增减报告：
  - 新增：934 行
  - 删除：53 行
  - 净增：881 行
- no maintainability findings
- 本次是否已尽最大努力优化可维护性：是
  - live mode 被收敛成显式配置，不做隐式 fallback
  - Linear 接入通过 `provider -> sync manager -> repository -> runtime service` 这条单路径进入
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是
  - 这期只增加官方数据同步和 D1 读底座，没有把社区建议、投票、评论系统一起塞进来
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：出现净增长，但属于最小必要
  - 这是把 preview 门户升级为真实官方数据门户所需的最小新增：migration、repository、provider、sync manager、runtime service
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是
  - `PortalRuntimeService` 统一掌管 mode 决策
  - `LinearSourceProvider` 只负责读 Linear 和映射
  - `PortalSyncManager` 只负责编排同步
  - `Repository` 只负责 D1
- 目录结构与文件组织是否满足当前项目治理要求：满足
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：已执行独立复核
