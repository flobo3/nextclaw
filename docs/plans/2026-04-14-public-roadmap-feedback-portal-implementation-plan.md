# Public Roadmap and Feedback Portal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 NextClaw 仓库中落地一个可部署到 Cloudflare 的“公开路线图 + 社区反馈门户”应用，首版支持官方路线图展示、公开阶段映射、类型筛选、用户建议提交、投票、评论与官方事项关联。

**Architecture:** 新应用保持单 app root，但在 `src/` 内按 `app / features / managers / stores / services / shared` 的 L1 结构展开，避免一开始铺满空壳目录。后端围绕统一公开领域模型构建，使用 `SourceAdapter -> SourceSyncManager -> Repository / QueryService / WriteService` 链路承接 Linear 与 D1；前端采用严格的 `Presenter -> Manager -> Store -> Business Component -> UI Component` 边界，避免把业务流程散落到组件和 effect 中。

**Tech Stack:** React、Vite、TypeScript、TanStack Query、Zustand、Hono、Cloudflare Workers、Cloudflare D1、Playwright、tsx test、Linear API。

---

## 相关文档

- [Public Roadmap and Feedback Portal Design](./2026-04-14-public-roadmap-feedback-portal-design.md)
- [NextClaw 产品愿景](../VISION.md)
- [Unified Desktop and Web Presence Lifecycle Design](./2026-04-14-unified-desktop-web-presence-lifecycle-design.md)

## 先冻结的维护性约束

在开始实现前，先锁定以下结构约束，后续任务不得绕开：

1. 新应用目录固定为 `apps/public-roadmap-feedback-portal`，不额外引入模糊别名目录。
2. 前端采用 `src/app`, `src/features`, `src/managers`, `src/stores`, `src/services`, `src/shared`，只有出现多个稳定并列业务域时才使用 `src/features`；禁止同时再长一层无意义的 `modules/`、`containers/`、`helpers/`。
3. 前端复杂业务逻辑必须落到 manager / presenter class，不放在 React 组件、hook 或 `useEffect` 里。
4. 后端所有业务编排必须落到 class owner，不允许用一排 `prepareX / syncX / mapX / saveX` 普通函数拼主流程。
5. `shared` 只放真正跨 feature 复用且边界稳定的契约或纯展示组件；任何仅服务单一 feature 的代码都留在 feature root 内。
6. Public API 与前端状态模型中禁止泄漏 `LinearIssue` 这类上游专属结构，统一用公开领域模型。
7. 评论、投票、建议首版只写 Portal 自己的 D1，不回写 Linear。

## 目标目录草案

```text
apps/public-roadmap-feedback-portal/
├── index.html
├── package.json
├── eslint.config.mjs
├── tsconfig.json
├── tsconfig.backend.json
├── tsconfig.worker.json
├── vite.config.ts
├── wrangler.toml
├── migrations/
├── scripts/
├── shared/
├── server/
├── worker/
└── src/
    ├── app/
    ├── features/
    ├── managers/
    ├── services/
    ├── shared/
    └── stores/
```

---

### Task 1: 创建应用骨架并冻结目录边界

**Files:**
- Create: `apps/public-roadmap-feedback-portal/package.json`
- Create: `apps/public-roadmap-feedback-portal/index.html`
- Create: `apps/public-roadmap-feedback-portal/eslint.config.mjs`
- Create: `apps/public-roadmap-feedback-portal/tsconfig.json`
- Create: `apps/public-roadmap-feedback-portal/tsconfig.backend.json`
- Create: `apps/public-roadmap-feedback-portal/tsconfig.worker.json`
- Create: `apps/public-roadmap-feedback-portal/vite.config.ts`
- Create: `apps/public-roadmap-feedback-portal/wrangler.toml`
- Create: `apps/public-roadmap-feedback-portal/scripts/dev.utils.mjs`
- Create: `apps/public-roadmap-feedback-portal/scripts/smoke.test.mjs`
- Create: `apps/public-roadmap-feedback-portal/src/main.tsx`
- Create: `apps/public-roadmap-feedback-portal/src/app/app.tsx`
- Create: `apps/public-roadmap-feedback-portal/src/app/app-root.tsx`
- Create: `apps/public-roadmap-feedback-portal/server/index.ts`
- Create: `apps/public-roadmap-feedback-portal/server/portal.controller.ts`
- Create: `apps/public-roadmap-feedback-portal/worker/index.ts`
- Modify: `package.json`

**Step 1: 新建 app 并对齐参考应用脚本风格**

实现要点：
- 以 `apps/competitive-leaderboard` 为运行骨架参考。
- 在 app 内提供 `dev / build / start / lint / tsc / smoke / deploy`。
- 根 `package.json` 增加：
  - `dev:public-roadmap:portal`
  - `build:public-roadmap:portal`
  - `lint:public-roadmap:portal`
  - `tsc:public-roadmap:portal`
  - `smoke:public-roadmap:portal`
  - `validate:public-roadmap:portal`
  - `deploy:public-roadmap:portal`

**Step 2: 锁定前端目录，不提前铺满空目录**

实现要点：
- 只创建会在首版立即使用的目录。
- `src/` 采用 `app / features / managers / services / shared / stores`。
- 不创建 `utils/`、`hooks/`、`modules/` 这类宽泛目录，除非后续证明有稳定角色。

**Step 3: 运行基础构建确认骨架成立**

Run:
- `pnpm -C apps/public-roadmap-feedback-portal build`
- `pnpm -C apps/public-roadmap-feedback-portal lint`
- `pnpm -C apps/public-roadmap-feedback-portal tsc`

Expected:
- 空壳应用与 Worker 骨架可成功构建
- 目录结构未触发新增代码治理阻断

### Task 2: 定义统一公开领域模型与 API 契约

**Files:**
- Create: `apps/public-roadmap-feedback-portal/shared/public-roadmap-feedback-portal.types.ts`
- Create: `apps/public-roadmap-feedback-portal/shared/public-roadmap-feedback-portal.contract.test.ts`
- Modify: `apps/public-roadmap-feedback-portal/server/portal.controller.ts`
- Modify: `apps/public-roadmap-feedback-portal/src/services/portal-api.service.ts`

**Step 1: 在 shared 中定义统一公开模型**

必须包含的类型：
- `PublicPhase`
- `PublicItemType`
- `PublicItemSource`
- `PublicItem`
- `FeedbackEntry`
- `VoteSummary`
- `CommentSummary`
- `PortalOverview`
- `ItemsQuery`
- `FeedbackQuery`
- `ApiEnvelope<T>`

约束：
- 不出现 `LinearIssue`、`LinearState` 这类上游专属类型名。
- `sourceStatus` 作为可选元信息保留在 `sourceMetadata` 或专门摘要对象中，不变成全局主语义。

**Step 2: 为契约补最小测试**

测试覆盖：
- `publicPhase` 枚举完整
- `ApiEnvelope` 成功/失败结构固定
- `PublicItem` 同时支持官方事项和社区关联摘要

**Step 3: 前后端统一改为消费 shared contract**

实现要点：
- API controller 和前端 api service 只依赖 shared contract。
- 禁止各自定义一套几乎重复的 response 类型。

Run:
- `pnpm -C apps/public-roadmap-feedback-portal exec tsx --test shared/public-roadmap-feedback-portal.contract.test.ts`

### Task 3: 设计 D1 schema 与仓储 owner

**Files:**
- Create: `apps/public-roadmap-feedback-portal/migrations/0001_init.sql`
- Create: `apps/public-roadmap-feedback-portal/server/database/portal-db.client.ts`
- Create: `apps/public-roadmap-feedback-portal/server/repositories/public-item.repository.ts`
- Create: `apps/public-roadmap-feedback-portal/server/repositories/item-source-link.repository.ts`
- Create: `apps/public-roadmap-feedback-portal/server/repositories/feedback-entry.repository.ts`
- Create: `apps/public-roadmap-feedback-portal/server/repositories/comment.repository.ts`
- Create: `apps/public-roadmap-feedback-portal/server/repositories/vote.repository.ts`
- Create: `apps/public-roadmap-feedback-portal/server/repositories/repository-contract.test.ts`
- Modify: `apps/public-roadmap-feedback-portal/package.json`
- Modify: `apps/public-roadmap-feedback-portal/wrangler.toml`

**Step 1: 新增 D1 migration 与本地/远端迁移脚本**

Schema 至少包含：
- `public_items`
- `item_source_links`
- `feedback_entries`
- `comments`
- `votes`

同时在 `package.json` 增加：
- `db:migrate:local`
- `db:migrate:remote`

**Step 2: 建立 DB client 与 repository owner**

约束：
- 所有 SQL 都收敛在 repository class 中。
- query service 只组合 repository，不直接写 SQL。
- repository 方法全部使用箭头函数 class field。

**Step 3: 为 repository contract 补最小测试**

测试覆盖：
- 创建/读取 public item
- 创建 feedback entry 并关联 item
- 对 item 和 feedback 投票
- 创建评论并按 target 查询

Run:
- `pnpm -C apps/public-roadmap-feedback-portal run db:migrate:local`
- `pnpm -C apps/public-roadmap-feedback-portal exec tsx --test server/repositories/repository-contract.test.ts`

### Task 4: 实现 Source Adapter 与同步 owner

**Files:**
- Create: `apps/public-roadmap-feedback-portal/server/source-adapters/source-adapter.types.ts`
- Create: `apps/public-roadmap-feedback-portal/server/source-adapters/linear-source.adapter.ts`
- Create: `apps/public-roadmap-feedback-portal/server/source-adapters/linear-source.adapter.test.ts`
- Create: `apps/public-roadmap-feedback-portal/server/managers/source-sync.manager.ts`
- Create: `apps/public-roadmap-feedback-portal/server/managers/source-sync.manager.test.ts`
- Create: `apps/public-roadmap-feedback-portal/server/config/source-sync-config.ts`
- Modify: `apps/public-roadmap-feedback-portal/server/portal.controller.ts`

**Step 1: 定义 adapter contract**

接口至少包含：
- `listPublicItems = async () => {}`
- `mapSourceRecordToPublicDraft = () => {}`
- `supportsProvider = () => {}`

约束：
- `LinearSourceAdapter` 只负责获取和映射，不负责写库。
- `SourceSyncManager` 负责编排 adapter 与 repository。

**Step 2: 在 config 中定义 `sourceStatus -> publicPhase` 映射**

默认映射：
- `Backlog -> considering`
- `Todo -> planned`
- `In Progress -> building`
- `In Review -> reviewing`
- `Done -> shipped`
- `Canceled -> closed`

约束：
- 映射集中配置，不散落在 controller、component 或 presenter 中。

**Step 3: 为 adapter 和 sync manager 补测试**

测试覆盖：
- Linear 原始状态映射正确
- 非公开 issue 不进入同步结果
- 同步重复执行时更新而不是重复插入

Run:
- `pnpm -C apps/public-roadmap-feedback-portal exec tsx --test server/source-adapters/linear-source.adapter.test.ts server/managers/source-sync.manager.test.ts`

### Task 5: 实现只读 API 与查询服务

**Files:**
- Create: `apps/public-roadmap-feedback-portal/server/services/portal-overview-query.service.ts`
- Create: `apps/public-roadmap-feedback-portal/server/services/public-item-query.service.ts`
- Create: `apps/public-roadmap-feedback-portal/server/services/feedback-query.service.ts`
- Create: `apps/public-roadmap-feedback-portal/server/services/portal-read-api.service.test.ts`
- Modify: `apps/public-roadmap-feedback-portal/server/portal.controller.ts`
- Modify: `apps/public-roadmap-feedback-portal/shared/public-roadmap-feedback-portal.types.ts`

**Step 1: 为首页、路线图、反馈列表定义查询 owner**

API 至少包括：
- `GET /health`
- `GET /api/overview`
- `GET /api/items`
- `GET /api/items/:itemId`
- `GET /api/updates`
- `GET /api/feedback`
- `GET /api/feedback/:feedbackId`

约束：
- controller 只做参数解析和 envelope 返回。
- 所有聚合逻辑进入 query service class。

**Step 2: 支持首版筛选能力**

`GET /api/items` 至少支持：
- `publicPhase`
- `type`
- `sort=recent|hot`
- `view=board|list`

`GET /api/feedback` 至少支持：
- `status`
- `sort=recent|top`

**Step 3: 为 read API 补服务层测试**

测试覆盖：
- overview 聚合计数
- board/list 查询结果
- shipped updates 返回顺序
- item detail 包含反馈与投票摘要

Run:
- `pnpm -C apps/public-roadmap-feedback-portal exec tsx --test server/services/portal-read-api.service.test.ts`

### Task 6: 实现写侧 API 与反滥用最小边界

**Files:**
- Create: `apps/public-roadmap-feedback-portal/server/services/feedback-write.service.ts`
- Create: `apps/public-roadmap-feedback-portal/server/services/vote-write.service.ts`
- Create: `apps/public-roadmap-feedback-portal/server/services/comment-write.service.ts`
- Create: `apps/public-roadmap-feedback-portal/server/services/portal-write-api.service.test.ts`
- Create: `apps/public-roadmap-feedback-portal/server/lib/request-fingerprint.ts`
- Modify: `apps/public-roadmap-feedback-portal/server/portal.controller.ts`
- Modify: `apps/public-roadmap-feedback-portal/shared/public-roadmap-feedback-portal.types.ts`

**Step 1: 实现建议提交**

接口：
- `POST /api/feedback`

约束：
- 首版字段只收 `title / body / authorName`
- 写入后默认 `status=open`
- 不自动创建 Linear issue

**Step 2: 实现点赞与评论**

接口：
- `POST /api/items/:itemId/votes`
- `POST /api/feedback/:feedbackId/votes`
- `POST /api/items/:itemId/comments`
- `POST /api/feedback/:feedbackId/comments`

约束：
- 点赞只做正向支持，不做点踩
- 使用请求指纹或等价轻量方案做首版去重
- 评论保留 `visible / pending / hidden` 状态位，为后续审核留 seam

**Step 3: 为写侧服务补测试**

测试覆盖：
- 重复点赞被拒绝或幂等
- 评论按 target 正确关联
- feedback 创建后可在查询接口读到

Run:
- `pnpm -C apps/public-roadmap-feedback-portal exec tsx --test server/services/portal-write-api.service.test.ts`

### Task 7: 建立前端 Presenter / Manager / Store 骨架

**Files:**
- Create: `apps/public-roadmap-feedback-portal/src/presenter/portal.presenter.ts`
- Create: `apps/public-roadmap-feedback-portal/src/presenter/presenter-context.tsx`
- Create: `apps/public-roadmap-feedback-portal/src/stores/roadmap-view.store.ts`
- Create: `apps/public-roadmap-feedback-portal/src/stores/feedback-compose.store.ts`
- Create: `apps/public-roadmap-feedback-portal/src/stores/item-detail.store.ts`
- Create: `apps/public-roadmap-feedback-portal/src/managers/roadmap-view.manager.ts`
- Create: `apps/public-roadmap-feedback-portal/src/managers/feedback-compose.manager.ts`
- Create: `apps/public-roadmap-feedback-portal/src/managers/item-detail.manager.ts`
- Create: `apps/public-roadmap-feedback-portal/src/services/portal-api.service.ts`
- Create: `apps/public-roadmap-feedback-portal/src/managers/portal-managers.test.ts`
- Modify: `apps/public-roadmap-feedback-portal/src/main.tsx`
- Modify: `apps/public-roadmap-feedback-portal/src/app/app-root.tsx`

**Step 1: 创建全局 presenter 与三个首版 manager**

首版 manager owner：
- `RoadmapViewManager`
- `FeedbackComposeManager`
- `ItemDetailManager`

约束：
- manager 与 presenter 方法全部使用箭头函数。
- 禁止 constructor。
- 组件不直接持有业务流程。

**Step 2: 用 store 承接 UI 状态，不用 effect 做补丁**

至少收敛：
- 路线图筛选与视图模式
- 建议提交对话框状态
- 当前详情项 ID 与展开状态

**Step 3: 为 manager 补最小测试**

测试覆盖：
- board/list 视图切换
- 筛选参数转 API 查询参数
- 建议提交表单状态机

Run:
- `pnpm -C apps/public-roadmap-feedback-portal exec tsx --test src/managers/portal-managers.test.ts`

### Task 8: 实现前端 features 与纯展示组件

**Files:**
- Create: `apps/public-roadmap-feedback-portal/src/features/overview/overview-section.tsx`
- Create: `apps/public-roadmap-feedback-portal/src/features/roadmap/roadmap-section.tsx`
- Create: `apps/public-roadmap-feedback-portal/src/features/roadmap/roadmap-board.tsx`
- Create: `apps/public-roadmap-feedback-portal/src/features/roadmap/roadmap-list.tsx`
- Create: `apps/public-roadmap-feedback-portal/src/features/updates/updates-section.tsx`
- Create: `apps/public-roadmap-feedback-portal/src/features/feedback/feedback-section.tsx`
- Create: `apps/public-roadmap-feedback-portal/src/features/feedback/submit-feedback-dialog.tsx`
- Create: `apps/public-roadmap-feedback-portal/src/features/item-detail/item-detail-panel.tsx`
- Create: `apps/public-roadmap-feedback-portal/src/shared/ui/panel.tsx`
- Create: `apps/public-roadmap-feedback-portal/src/shared/ui/stat-card.tsx`
- Create: `apps/public-roadmap-feedback-portal/src/shared/ui/tag-chip.tsx`
- Create: `apps/public-roadmap-feedback-portal/src/index.css`
- Modify: `apps/public-roadmap-feedback-portal/src/app/app.tsx`

**Step 1: 先搭业务组件，再拆纯展示 UI**

约束：
- `features/*` 组件可以读 presenter/store/query。
- `shared/ui/*` 只能接 view props，不能 import manager/store/presenter。

**Step 2: 默认主视图以公开阶段为中心**

实现要点：
- 首页显示概览而不是直接跳进表格
- 路线图默认展示 `publicPhase`
- 详情视图中再补 `sourceStatus` 与类型信息

**Step 3: 控制 effect 边界**

只允许：
- `document.title`
- 浏览器事件订阅
- 对话框/DOM 同步

不允许：
- 用 effect 触发业务动作
- 用 effect 把 query 数据镜像进 store
- 用 effect 修补多个业务状态

### Task 9: 补同步入口、开发工具与冒烟脚本

**Files:**
- Create: `apps/public-roadmap-feedback-portal/server/controllers/internal-sync.controller.ts`
- Create: `apps/public-roadmap-feedback-portal/scripts/run-linear-sync.ts`
- Modify: `apps/public-roadmap-feedback-portal/package.json`
- Modify: `apps/public-roadmap-feedback-portal/scripts/smoke.test.mjs`
- Modify: `apps/public-roadmap-feedback-portal/wrangler.toml`

**Step 1: 增加内部同步入口**

实现要点：
- `POST /internal/sync/linear`
- 由内部 token 保护
- 只调用 `SourceSyncManager`

**Step 2: 增加本地开发同步命令**

建议脚本：
- `sync:linear:local`

用途：
- 本地对接 Linear 时快速把公开事项刷进本地 D1

**Step 3: 编写 Playwright 冒烟**

冒烟至少覆盖：
- 首页成功加载 overview
- 路线图能看到 `planned` / `building` / `shipped` 等公开阶段
- 可打开建议提交对话框
- 可查看某个 item detail

Run:
- `pnpm -C apps/public-roadmap-feedback-portal build`
- `pnpm -C apps/public-roadmap-feedback-portal smoke`

### Task 10: 完成验证、维护性复核与迭代留痕

**Files:**
- Modify: `package.json`
- Modify: `docs/logs/<latest-related-or-new-version>/README.md`
- Read: `docs/plans/2026-04-14-public-roadmap-feedback-portal-design.md`
- Read: `docs/plans/2026-04-14-public-roadmap-feedback-portal-implementation-plan.md`

**Step 1: 运行最小充分验证**

建议命令：
- `pnpm build:public-roadmap:portal`
- `pnpm lint:public-roadmap:portal`
- `pnpm tsc:public-roadmap:portal`
- `pnpm smoke:public-roadmap:portal`
- `pnpm lint:maintainability:guard`

**Step 2: 做独立 maintainability review**

必须检查：
- 是否新增了不必要目录
- 前端是否出现业务型 effect
- 是否把业务逻辑散回组件
- 是否把 SQL 散回 query service 或 controller
- 是否泄漏 Linear 专属结构到公共 API

**Step 3: 按 `docs/logs` 规则补留痕**

约束：
- 只有真正触达代码并收尾时才判断是并入最近相关迭代还是创建新迭代目录。
- 当前这份 implementation plan 本身不创建 `docs/logs` 目录。

---

## 分阶段提交建议

建议至少按以下批次提交，避免一个超大变更包：

1. `feat: scaffold public roadmap portal app`
2. `feat: add public portal domain contracts and d1 schema`
3. `feat: add linear sync and public read api`
4. `feat: add feedback write api and frontend presenter architecture`
5. `feat: add roadmap portal views and smoke coverage`

---

## 长期目标对齐 / 可维护性推进

- 这次实现不是“把 Linear 网页化”，而是在为 NextClaw 增加一个新的统一入口：对外它是产品脉搏与参与入口，对内它是公开表达层与反馈聚合层。
- 维护性上，最关键的推进不是功能点，而是提前锁定结构：
  - 上游系统通过 adapter 接入，而不是渗透到各层。
  - 前端通过 presenter/manager/store 收敛，而不是让组件和 effect 接管业务流程。
  - 数据访问通过 repository 收敛，而不是让 SQL 和聚合逻辑到处漂。
- 若实现阶段出现净增长，新增代码的最小必要性应主要集中在三个 owner：
  - `SourceSyncManager` 及其 adapter
  - 读写 query/write services
  - 前端 presenter/manager/store 骨架
- 同时必须顺手偿还至少一笔维护性债务：
  - 不复制第二套 Linear 模型
  - 不新增模糊 `utils/helpers/hooks` 垃圾目录
  - 不在前端制造业务型 effect 和 prop-drilling 链路

