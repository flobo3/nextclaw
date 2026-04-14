# v0.16.23-public-roadmap-portal-phase3

## 迭代完成说明

- 在 [`apps/public-roadmap-feedback-portal`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal) 完成第 3 期“社区反馈闭环”：
  - 新增共享社区契约：[`public-roadmap-feedback-portal.types.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/shared/public-roadmap-feedback-portal.types.ts)
    - 补齐 `FeedbackEntry / FeedbackThread / CommentEntry / CreateFeedbackInput / CreateVoteResponse / CreateCommentResponse`
    - `PublicItemDetail` 现在会显式返回事项评论与关联建议
  - 新增社区数据面：
    - D1 migration：[`0002_community_feedback.sql`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/migrations/0002_community_feedback.sql)
    - repositories：
      - [`feedback-entry.repository.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/server/repositories/feedback-entry.repository.ts)
      - [`comment.repository.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/server/repositories/comment.repository.ts)
      - [`vote.repository.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/server/repositories/vote.repository.ts)
    - 写侧 owner：[`portal-write.service.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/server/portal-write.service.ts)
    - preview owner：
      - [`portal-preview.config.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/server/preview/portal-preview.config.ts)
      - [`portal-preview-state.service.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/server/preview/portal-preview-state.service.ts)
  - 扩展公开 API：
    - `GET /api/feedback`
    - `POST /api/feedback`
    - `POST /api/items/:itemId/votes`
    - `POST /api/items/:itemId/comments`
    - `POST /api/feedback/:feedbackId/votes`
    - `POST /api/feedback/:feedbackId/comments`
  - 前端新增社区反馈域：
    - presenter manager / store：
      - [`community-feedback.manager.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/src/managers/community-feedback.manager.ts)
      - [`community-feedback.store.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/src/stores/community-feedback.store.ts)
    - 交互界面：
      - [`community-feedback-section.tsx`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/src/features/community-feedback/components/community-feedback-section.tsx)
      - [`feedback-thread-card.tsx`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/src/features/community-feedback/components/feedback-thread-card.tsx)
      - [`item-detail-panel.tsx`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/src/features/item-detail/components/item-detail-panel.tsx)
      - [`comment-composer.tsx`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/src/shared/components/comment-composer.tsx)
  - 用户现在可以：
    - 提交公开建议
    - 给官方事项点赞和评论
    - 给社区建议点赞和评论
    - 在官方事项详情里直接看到关联建议
- 目录治理同步优化：
  - 把 preview 和 community 内部类型收进子目录，避免 `server/` 顶层继续越过维护性预算。
- 相关设计文档：
  - [public-roadmap-feedback-portal-design.md](/Users/peiwang/Projects/nextbot/docs/plans/2026-04-14-public-roadmap-feedback-portal-design.md)
  - [public-roadmap-feedback-portal-implementation-plan.md](/Users/peiwang/Projects/nextbot/docs/plans/2026-04-14-public-roadmap-feedback-portal-implementation-plan.md)

## 测试/验证/验收方式

- 已通过：
  - `pnpm build:public-roadmap:portal`
  - `pnpm lint:public-roadmap:portal`
  - `pnpm tsc:public-roadmap:portal`
  - `pnpm smoke:public-roadmap:portal`
  - `pnpm validate:public-roadmap:portal`
  - `pnpm lint:new-code:governance -- apps/public-roadmap-feedback-portal`
- 冒烟覆盖的真实链路：
  - 打开首页并确认预览模式与社区反馈区可见
  - 提交一条新的公开建议并关联官方事项
  - 给该建议点赞并发表评论
  - 打开关联官方事项详情，确认建议联动可见
  - 给官方事项点赞并发表评论
- 全仓 `pnpm lint:maintainability:guard` 本次未能完整通过，但阻断原因已经确认与本次无关：
  - 当前工作区里已有他人/既有变更触发的文档命名问题：`docs/logs/v0.16.22-desktop-windows-startup-seed-metadata/GITHUB_RELEASE.md`
  - 与本次相关的新增应用子树治理和目录预算问题已修正，`apps/public-roadmap-feedback-portal` 自身的 diff-only 治理检查已通过。

## 发布/部署方式

- 本地开发：
  - `pnpm dev:public-roadmap:portal`
- 本地构建：
  - `pnpm build:public-roadmap:portal`
- 本地验证：
  - `pnpm validate:public-roadmap:portal`
- D1 migration：
  - `pnpm -C apps/public-roadmap-feedback-portal db:migrate:local`
  - `pnpm -C apps/public-roadmap-feedback-portal db:migrate:remote`
- Cloudflare Worker 部署：
  - `pnpm deploy:public-roadmap:portal`
- live mode 说明：
  - 官方路线图仍走 `PUBLIC_ROADMAP_FEEDBACK_PORTAL_DATA_MODE=live + D1 + Linear sync`
  - 社区建议、评论、投票在 live mode 下写入 D1
  - preview mode 下这些交互是显式临时态，只用于本地预览和演示

## 用户/产品视角的验收步骤

1. 打开门户首页后，确认能看到 `公开路线图与产品进展`、`社区建议与反馈` 和预览模式提示。
2. 在“提交一个建议”表单里输入标题、类型、描述，必要时关联一个官方事项，然后提交。
3. 新建议应立即出现在社区反馈列表中，并可继续被点赞和评论。
4. 点击某个官方事项进入详情侧板后，应能看到：
   - 该事项的支持数、评论数、关联建议数
   - 该事项已有评论
   - 已关联到该事项的社区建议
5. 在事项详情里继续评论或点赞后，页面应刷新出最新信号。
6. 把环境切到 `live` 并执行 D1 migration 后，社区建议、评论、投票应持久化到 D1，而不是只存在 preview 内存态。

## 可维护性总结汇总

- 长期目标对齐 / 可维护性推进：
  - 这期不是单纯给路线图页加几个按钮，而是把“官方进展 + 外部反馈”统一进同一个公开入口，向 NextClaw 的统一入口目标推进了一步。
  - 同时仍然坚持“官方执行系统”和“社区互动数据面”分离，不把 Linear 直接变成公开评论系统，保持后续替换数据源和扩展反馈治理的空间。
- 可维护性复核结论：通过
- 本次顺手减债：是
- 代码增减报告：
  - 新增：2352 行
  - 删除：105 行
  - 净增：2247 行
- 非测试代码增减报告：
  - 新增：2318 行
  - 删除：95 行
  - 净增：2223 行
- no maintainability findings
- 可维护性总结：
  - 这次净增长属于新增能力的最小必要集合，但已经提前做了两笔关键减债：一是把 preview / community 责任压回子目录，二是把写侧逻辑收进 `PortalWriteService`，没有让评论、投票、建议提交流入 controller 或 React 组件。
  - 当前主要观察点是 [`portal-query.service.ts`](/Users/peiwang/Projects/nextbot/apps/public-roadmap-feedback-portal/server/portal-query.service.ts) 已明显变大；下一步如果继续扩展审核、合并或统计能力，应优先把 engagement 聚合和 thread 组装继续拆出稳定子 owner。
