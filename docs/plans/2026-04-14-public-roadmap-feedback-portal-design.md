# Public Roadmap and Feedback Portal Design

**Goal:** 为 NextClaw 设计一个部署在 Cloudflare 上的“公开路线图 + 社区反馈门户”，既能对外展示产品规划、进展与已交付事项，也能让用户提交建议、投票和评论，并且从第一版起就保持对数据源与交互形态的解耦。

**Architecture:** 采用“统一公开产品模型 + 可插拔数据源适配层”的路线。Linear 只作为首个官方规划数据源，不直接暴露为产品本体；对外统一展示 `PublicItem`、`FeedbackEntry`、`Vote`、`Comment` 等产品级对象。系统运行在 Cloudflare Worker 上，Hono 负责 API，前端使用 React + Vite，D1 承载公开反馈与同步后的聚合数据，后续可按同一 adapter contract 扩展到 Jira、GitHub Projects、手工录入甚至其它内部系统。

**Tech Stack:** React、Vite、TypeScript、TanStack Query、Hono、Cloudflare Workers、Cloudflare D1、Cloudflare KV（可选缓存）、Linear API、Cron/Webhook 同步。

---

## 长期目标对齐 / 可维护性推进

- 这项设计不是为了再做一个孤立站点，而是在强化 NextClaw 作为“统一入口”的地位：用户不需要先去 Linear、群聊、私信、文档站分别找规划、进展和反馈，而是通过一个统一入口理解产品脉搏并参与产品演进。
- 方案坚持“编排优先”而不是“功能堆叠优先”：
  - 不复制一整套内部项目管理系统。
  - 不把 Linear 生硬暴露给外部用户。
  - 不把评论、投票、需求、规划分别做成互相割裂的独立页面。
- 可维护性方向明确如下：
  - 前端和后端都围绕统一的公开领域模型构建，而不是把 `linear issue` 直接传播到各层。
  - 官方规划与社区反馈从第一版就分 owner，但在产品层统一汇总，避免后续返工。
  - 通过 adapter contract 把“接哪个系统”与“产品如何表达”解耦，降低未来替换或扩展数据源的成本。

---

## 1. 问题重新定义

这次要做的不是“一个能看 Linear 的网页”，而是一个公开的产品运营界面。它至少同时承担四个角色：

1. 对外展示 NextClaw 当前在做什么。
2. 对外说明哪些事项已经完成、哪些正在推进、哪些还处于想法阶段。
3. 对外收集社区建议、投票与评论。
4. 对内沉淀一个更统一的需求信号入口，帮助判断方向和优先级。

因此它的产品定义应是：

**NextClaw 的公开路线图与反馈门户。**

Linear 只是首个官方数据底座，不是这个产品的身份本身。

---

## 2. 核心判断

### 2.1 不直接暴露 Linear 原始形态

不推荐把 Linear 的列、状态、字段和术语直接原样暴露给最终用户。原因有三：

- Linear 的工作流是为内部执行设计的，不是为公众理解设计的。
- 后续你很可能会更换团队、账号、工作流，或者增加其它系统。
- 用户真正关心的是“这个功能在考虑 / 规划 / 开发 / 验收 / 已上线的哪个阶段”，而不是你内部项目管理工具的全部细节。

### 2.2 必须保留 Linear 语义，但不能被 Linear 绑死

不应该只保留一个三列看板，也不能把真实状态压扁成单一字段。正确做法是保留两层状态：

- `sourceStatus`
  - 来自 Linear 的原始状态，如 `Backlog / Todo / In Progress / In Review / Done / Canceled`
- `publicPhase`
  - 对外的公开阶段，如 `Considering / Planned / Building / Reviewing / Shipped / Closed`

这样既保留执行语义，也保留对外表达能力。

### 2.3 状态、类型、来源是三条独立维度

事项展示至少要拆成下面三维，而不是把它们揉在一起：

- `status`
  - 当前进度如何
- `type`
  - 这是 feature、bug、improvement、research 还是别的
- `source`
  - 它来自 Linear、社区建议、手工发布还是未来别的系统

### 2.4 评论和投票不建议首版回写到 Linear

首版不建议把公开评论和投票直接写进 Linear。更稳的边界是：

- Linear 负责内部执行和官方规划
- Portal 自己的数据库负责社区反馈、点赞、评论、建议
- 二者通过映射关系关联

这样职责最清晰，也更利于做审核、反垃圾、匿名/署名策略和未来扩展。

---

## 3. 产品定位

这个产品建议采用以下定位：

**一个公开可访问的产品脉搏门户，让任何用户都能理解 NextClaw 正在构建什么、已经交付什么，并用更低门槛的方式提出建议和表达优先级。**

它不是：

- 不是 Linear 的 iframe
- 不是项目管理后台外放版
- 不是只有宣传价值、没有反馈闭环的静态页面
- 不是一开始就做成复杂的多角色后台系统

它应该同时兼顾两种价值：

- `宣传价值`
  - 对外传达节奏、方向、执行力与产品感
- `反馈价值`
  - 形成社区输入、帮助排序优先级、提供结构化信号

---

## 4. 目标与非目标

## 4.1 目标

首版目标应收敛为：

1. 公开展示官方路线图与近期进展。
2. 公开展示已完成事项与产品演进轨迹。
3. 允许用户提交建议、对事项投票、发表评论。
4. 支持按公开阶段、事项类型、热度、更新时间等方式浏览。
5. 保持数据层可扩展，未来可新增非 Linear 数据源而无需推翻产品模型。

## 4.2 非目标

首版明确不做：

1. 不做完整的后台运营系统。
2. 不做公开用户登录体系上的复杂权限分层。
3. 不把所有内部 issue 都公开。
4. 不把所有社区评论自动同步回 Linear。
5. 不做复杂的工作流编辑器和项目管理器。
6. 不把所有内部字段、负责人、估点、敏感讨论完全对外暴露。

---

## 5. 用户与使用场景

## 5.1 外部关注者

他们想快速知道：

- 这个产品最近在做什么
- 哪些方向已经上线
- 哪些方向值得期待
- 自己能不能给意见

他们更偏好 `公开阶段 + 类型 + 热度` 这种产品视角。

## 5.2 深度用户 / 早期 adopter

他们除了看进展，还想参与排序：

- 给某个功能点赞
- 提出具体需求
- 在已有事项下评论
- 看别人是不是也在关心同样问题

他们需要比普通用户更多的细节，但不需要看到内部全部执行信息。

## 5.3 团队内部成员

他们会把它当作一个外部展示层和反馈聚合层：

- 检查某个事项是否公开
- 看社区建议是否已经挂到某条路线图
- 看哪些需求热度高
- 用公开表达替代内部项目管理术语

---

## 6. 产品信息架构

首版建议采用五个主区域：

### 6.1 首页 / Overview

作用：

- 用产品化方式概览当前脉搏，而不是直接进入纯列表

建议内容：

- 当前在推进的重点事项数量
- 最近已交付事项数量
- 热门建议数量
- 最近更新日期
- 引导用户“查看路线图”或“提交建议”

### 6.2 Roadmap

作用：

- 展示官方公开事项

建议支持两种视图：

- `Phase Board`
  - 按 `publicPhase` 聚合的列视图
- `List View`
  - 支持筛选和排序的列表

建议筛选项：

- 公开阶段
- 事项类型
- 热度
- 最近更新
- 仅看已完成
- 仅看社区高关注

### 6.3 Updates / Shipped

作用：

- 强化“产品在持续交付”的感知

内容建议：

- 已完成事项时间线
- 近期 shipped highlights
- 每项显示发布日期、简介、关联反馈数量

### 6.4 Feedback / Requests

作用：

- 承接社区建议与新需求提交

建议内容：

- 提交新建议
- 浏览社区建议
- 按票数/最新评论排序
- 标注是否已被官方吸收进路线图

### 6.5 Item Detail

作用：

- 作为官方事项和社区反馈的汇总详情页

建议展示：

- 标题
- 摘要
- 公开阶段
- 原始状态摘要
- 类型
- 最近更新
- 官方说明
- 关联建议
- 评论
- 投票

---

## 7. 统一领域模型

产品层不直接使用 `LinearIssue` 作为主对象，而是定义统一的公开领域模型。

## 7.1 PublicItem

表示一个公开可展示的产品事项。

建议字段：

- `id`
- `slug`
- `title`
- `summary`
- `description`
- `publicPhase`
- `type`
- `source`
- `visibility`
- `isOfficial`
- `createdAt`
- `updatedAt`
- `shippedAt`
- `feedbackStats`
- `sourceMetadata`

说明：

- 无论该事项来自 Linear 还是未来的其它系统，对前端都统一表现为 `PublicItem`
- `sourceMetadata` 里可以保留原始状态、team、label 等信息，但不把它变成全局主语义

## 7.2 SourceLink

表示一个公开事项和外部系统对象的映射关系。

建议字段：

- `itemId`
- `provider`
- `providerObjectId`
- `providerUrl`
- `sourceStatus`
- `sourceType`
- `lastSyncedAt`

说明：

- 它是内部 contract，不一定全部对前端公开
- 未来可同时支持多个 source link

## 7.3 FeedbackEntry

表示社区提出的一条建议。

建议字段：

- `id`
- `slug`
- `title`
- `body`
- `status`
  - 如 `open / under-review / accepted / merged / declined`
- `authorName`
- `createdAt`
- `updatedAt`
- `linkedItemId`
- `voteCount`
- `commentCount`

## 7.4 Vote

表示用户对某个事项或建议的支持信号。

建议字段：

- `id`
- `targetType`
  - `public-item` 或 `feedback-entry`
- `targetId`
- `fingerprint` 或用户标识
- `createdAt`

首版建议只做点赞，不做点踩，避免信号含义复杂化。

## 7.5 Comment

表示对事项或建议的评论。

建议字段：

- `id`
- `targetType`
- `targetId`
- `body`
- `authorName`
- `createdAt`
- `status`
  - `visible / pending / hidden`

---

## 8. 状态与类型设计

## 8.1 推荐的公开阶段

推荐对外统一以下 `publicPhase`：

- `considering`
  - 正在观察、收集信号、尚未承诺开发
- `planned`
  - 已进入公开规划
- `building`
  - 正在开发
- `reviewing`
  - 已接近完成，正在验证或收尾
- `shipped`
  - 已完成并发布
- `closed`
  - 已取消、合并进其它方向或不再继续

这比直接暴露 Linear workflow 更适合公开理解，也比简单三列更完整。

## 8.2 推荐的原始状态映射

首版可采用如下映射：

| Linear source status | Public phase |
| --- | --- |
| `Backlog` | `considering` |
| `Todo` | `planned` |
| `In Progress` | `building` |
| `In Review` | `reviewing` |
| `Done` | `shipped` |
| `Canceled` | `closed` |

注意：

- 这只是默认映射，不应写死在 UI 文案里
- 后端应保留 mapping config，方便后续按团队或 workflow 调整

## 8.3 推荐的事项类型

公开展示建议优先支持以下类型：

- `feature`
- `bug`
- `improvement`
- `research`

内部型 `chore`、纯治理或低传播价值事项默认不公开，除非被显式标记为公开。

## 8.4 公开性控制

每个官方事项需要有 `visibility`：

- `public`
  - 对外展示
- `internal`
  - 仅内部存在，不同步到公开门户
- `hidden`
  - 已同步但暂不展示

首版建议通过 Linear label、team convention 或特定字段来决定是否公开，而不是默认全量同步。

---

## 9. 官方事项与社区反馈的关系

这是本产品最重要的设计点之一。

官方事项和社区反馈不能混成一类数据，但也不能彼此孤立。

推荐关系如下：

- `PublicItem`
  - 官方规划与交付的公开表达
- `FeedbackEntry`
  - 社区输入的原子表达
- `FeedbackEntry.linkedItemId`
  - 当官方确认某条建议已经被吸收、对应到某个 roadmap item 时建立关联

这样能形成三种状态：

1. `未归类建议`
  - 用户提了，但尚未进入官方路线图
2. `已关联建议`
  - 用户建议已对应某个官方事项
3. `官方事项`
  - 来自 Linear 或未来其它正式数据源的公开事项

这个设计有两个优点：

- 不会强迫所有社区建议都先变成 Linear issue
- 也不会让官方路线图脱离社区输入

---

## 10. 推荐的系统架构

## 10.1 前端

推荐继续沿用现有参考应用风格：

- React
- Vite
- TanStack Query
- 轻量但有产品感的页面结构

前端模块建议：

- `portal-shell`
- `roadmap-board`
- `roadmap-list`
- `updates-timeline`
- `feedback-feed`
- `item-detail`
- `submit-feedback-dialog`

前端不应直接处理 Linear 语义和映射逻辑，而只消费公开 API。

## 10.2 后端

推荐使用 Hono 作为 Cloudflare Worker 内 API 层。

主要职责：

- 提供公开读取 API
- 提供提交反馈、评论、投票 API
- 提供后台或内部使用的同步入口
- 统一做数据映射、内容过滤与公开性控制

## 10.3 数据层

推荐首版使用 Cloudflare D1。

原因：

- 足够支撑首版关系型需求
- 适合事项、评论、投票、映射关系等结构化数据
- Cloudflare 部署链路一致

KV 可作为可选缓存层，用于：

- 首页聚合结果缓存
- 高频读接口缓存
- 同步结果短时缓存

---

## 11. Source Adapter 设计

为了避免被 Linear 绑死，后端不应在 service 层到处出现 `linear` 判断，而应定义统一 adapter contract。

建议定义：

- `SourceAdapter`
  - `listPublicItems()`
  - `getItemBySourceId()`
  - `syncIntoPortalStore()`
  - `mapSourceStatusToPublicPhase()`

首版只实现：

- `LinearSourceAdapter`

未来可新增：

- `JiraSourceAdapter`
- `GitHubProjectsSourceAdapter`
- `ManualSourceAdapter`

### 11.1 首版 Linear 同步策略

推荐采用“定时拉取优先，webhook 作为后续增强”的路线。

原因：

- 首版更稳定
- 部署与调试复杂度更低
- 更适合先验证产品模型

可采用：

- Cloudflare Cron 定时同步
- 手动同步接口供内部触发

后续如果需要更实时，再加 webhook。

### 11.2 同步内容

首版同步建议只拉取：

- 标题
- 描述摘要
- 原始状态
- 类型
- label
- 更新时间
- URL
- 是否公开的标记

不建议首版同步所有字段、评论和内部讨论。

---

## 12. API 设计建议

首版建议至少提供以下 API：

### 12.1 公开读取

- `GET /api/overview`
- `GET /api/items`
- `GET /api/items/:itemId`
- `GET /api/updates`
- `GET /api/feedback`
- `GET /api/feedback/:feedbackId`

### 12.2 公开互动

- `POST /api/feedback`
- `POST /api/items/:itemId/votes`
- `DELETE /api/items/:itemId/votes/:voteId`
- `POST /api/feedback/:feedbackId/votes`
- `POST /api/items/:itemId/comments`
- `POST /api/feedback/:feedbackId/comments`

### 12.3 内部同步

- `POST /internal/sync/linear`

这个接口需要内部密钥保护，不对公众开放。

---

## 13. 推荐的数据表草案

首版 D1 可考虑以下表：

### 13.1 `public_items`

- `id`
- `slug`
- `title`
- `summary`
- `description`
- `public_phase`
- `item_type`
- `source`
- `visibility`
- `is_official`
- `created_at`
- `updated_at`
- `shipped_at`

### 13.2 `item_source_links`

- `id`
- `item_id`
- `provider`
- `provider_object_id`
- `provider_url`
- `source_status`
- `source_type`
- `raw_payload_json`
- `last_synced_at`

### 13.3 `feedback_entries`

- `id`
- `slug`
- `title`
- `body`
- `status`
- `linked_item_id`
- `author_name`
- `created_at`
- `updated_at`

### 13.4 `votes`

- `id`
- `target_type`
- `target_id`
- `fingerprint`
- `created_at`

### 13.5 `comments`

- `id`
- `target_type`
- `target_id`
- `body`
- `author_name`
- `status`
- `created_at`

首版先不做复杂账号体系时，`fingerprint` 可用匿名指纹或轻量验证码策略辅助去重。

---

## 14. 展示与交互策略

## 14.1 路线图主视图

默认主视图建议是公开阶段视图，而不是 Linear 状态视图。

原因：

- 更适合对外表达
- 更像产品而不是后台
- 更有宣传感

但详情页或筛选面板中可以展示：

- 原始状态摘要
- 关联标签
- 最近同步时间

## 14.2 列表比纯 Kanban 更重要

虽然 board 很直观，但这个产品不能只靠看板。因为用户还会有：

- 筛选类型
- 查看热门程度
- 搜索关键词
- 查看最近更新
- 查看已完成事项

因此首版建议“board + list”双视图并存。

## 14.3 热度信号建议

热度建议统一口径：

- 点赞数
- 评论数
- 关联建议数

不要首版就引入复杂的综合评分模型，以免解释成本过高。

## 14.4 建议提交体验

提交建议时应尽量降低门槛，但需要最小限度约束：

- 标题
- 内容
- 可选昵称

后端需保留：

- 去重策略
- 最低限度频率限制
- 内容审核能力预留

---

## 15. 首版范围建议

我的推荐是：

**首版优先做“官方路线图为主，反馈为辅”的版本。**

也就是说首版重点不在复杂社区系统，而在于先把“公开产品脉搏”做出来，并补上最必要的互动闭环。

### 15.1 首版必须有

1. 官方事项同步与公开展示
2. 公开阶段映射
3. 类型展示与筛选
4. 已完成事项与更新视图
5. 用户提交建议
6. 点赞
7. 评论
8. 官方事项与社区建议的关联能力

### 15.2 首版可以不做

1. 用户登录
2. 点踩
3. 多级评论线程
4. 复杂管理员后台
5. 自动把反馈写回 Linear
6. webhook 实时同步

---

## 16. 后续演进路线

## 16.1 Phase 2

- 增加搜索
- 增加更多排序和筛选
- 增加提案合并 / 重复建议识别
- 增加运营审核视图
- 增加 webhook 同步

## 16.2 Phase 3

- 支持多数据源
- 支持更丰富的 item relation
- 支持发布说明与事项自动串联
- 支持团队、模块或产品线维度浏览

---

## 17. 风险与应对

## 17.1 风险：把 Linear workflow 过度带进产品

应对：

- 以 `publicPhase` 为产品主语义
- 原始状态仅作为底层信息保留

## 17.2 风险：反馈区噪音太大

应对：

- 首版预留审核状态
- 点赞优先于复杂讨论
- 控制匿名滥用与重复提交

## 17.3 风险：官方事项和社区建议边界混乱

应对：

- 坚持 `PublicItem` 与 `FeedbackEntry` 分离
- 只通过 link 关联，不混表

## 17.4 风险：后续想接其它系统时推翻重来

应对：

- 从第一版起引入 adapter contract
- 不在公共 API 中泄漏 Linear 专属结构

---

## 18. 推荐的最终方案

综合产品表达、技术可行性、扩展空间和维护成本，我的最终推荐是：

**做一个基于 Cloudflare 的公开路线图与反馈门户，前端以公开阶段为主视图，后端以统一公开领域模型为中心，Linear 作为首个官方数据源，社区反馈独立存储在 D1 中，并通过事项关联形成一个既能展示进展、又能收集反馈的公开产品界面。**

这个方案优于“直接把 Linear 外放”的地方在于：

- 更像产品，而不是后台镜像
- 更利于宣传
- 更利于社区参与
- 更利于未来扩展
- 更利于长期维护

---

## 19. 验收标准

当首版落地时，至少应满足以下标准：

1. 用户进入首页后，能在数秒内理解 NextClaw 当前的公开进展与近期动态。
2. 用户能按公开阶段浏览路线图，而不需要理解 Linear 内部术语。
3. 用户能看见事项类型，如 `feature / bug / improvement / research`。
4. 用户能对某个事项点赞、评论，并能提交新的建议。
5. 社区建议可以保持独立存在，也可以关联到官方事项。
6. 后端已保留 `source status` 与 `public phase` 的映射关系。
7. 系统没有把评论、投票、建议等公开互动强耦合到 Linear。
8. 若未来新增第二个数据源，前端主模型无需重写。

---

## 20. 当前建议的下一步

如果继续往实现推进，下一步不应该直接写页面，而应先做三件事：

1. 确定首版公开字段和 `publicPhase` 映射配置。
2. 细化 D1 schema 与 API contract。
3. 基于现有 `competitive-leaderboard` 技术栈拆出一个新的 app skeleton，再进入实现计划。

