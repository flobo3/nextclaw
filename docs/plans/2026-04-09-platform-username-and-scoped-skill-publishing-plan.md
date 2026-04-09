# Platform Username And Scoped Skill Publishing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 NextClaw 建立正式的 skill 发布身份体系：管理员可发布官方 scope，普通平台用户登录并设置唯一 username 后可发布个人 scope skill，marketplace 以可治理、可追责、可识别的 scoped name 作为正式唯一标识。

**Architecture:** 以现有 `nextclaw-provider-gateway-api` 平台账号系统作为唯一身份源，不再把 marketplace `author` 当成身份。Marketplace skill 目录改为“内部 `id` + owner 用户归属 + 外部 `packageName(@scope/name)` + 发布状态”的组合模型；CLI publish 在调用 worker 前先通过平台账号校验登录态和 username，worker 再依据 bearer token 或 admin token 做最终授权。前端账号面板补齐 username 展示与设置入口，为存量用户提供补录路径。

**Tech Stack:** Cloudflare Workers + Hono + D1 + R2、`nextclaw-provider-gateway-api`、`marketplace-api`、`nextclaw` CLI、`nextclaw-ui` React + Zustand + React Query。

---

## 1. 长期目标对齐 / 可维护性推进

这次改动直接服务 NextClaw 作为“统一入口与能力编排层”的长期目标，因为 skill marketplace 不再只是一个可写的数据桶，而会成为可追溯、可治理、可识别的能力注册表。  
如果没有正式身份体系，用户无法自然理解“这是谁发布的、是不是官方、我能不能信任、后续谁维护”，这会削弱 NextClaw 作为默认入口的可信度。

本次默认推进以下维护性目标：

- 不再继续沿用“`author` 只是展示文本”的伪身份模型。
- 不把管理员发布和普通用户发布混在一条无约束的 upsert 逻辑里。
- 不引入第二套账号体系，统一复用平台账号系统。
- 不把唯一标识、展示名、归属权混成一个字段。
- 用显式状态和显式 owner 替代隐式约定，减少后续再叠补丁的概率。

## 2. 核心判断

### 2.1 必须区分三种身份层

skill 发布至少需要三个不同层次的标识：

1. **内部主键 `id`**
   - 用于数据库主键、稳定引用、内部关联。
   - 不对用户承担产品心智。

2. **正式唯一发布名 `packageName`**
   - 形如 `@nextclaw/lark-cli`、`@alice/notion-helper`。
   - 这是外部唯一标识，也是后续 install / publish / ownership / audit 的基础。

3. **展示信息**
   - `displayName` / `name` / `summary` / `authorLabel`
   - 可用于 UI 展示，但不参与权限判断。

### 2.2 官方与个人都统一走 scoped canonical name

推荐统一规则：

- 官方：`@nextclaw/<skill-name>`
- 个人：`@<username>/<skill-name>`

不再把裸 `slug` 视为真正唯一标识。  
兼容期可以保留“按旧裸 slug 安装官方 skill”的 alias，但真实存储与治理都以 scoped canonical name 为准。

### 2.3 普通用户必须登录且必须设置 username

仅登录不够。  
普通用户在 publish 前必须满足：

- 已登录平台账号
- 平台账号已设置唯一 username

如果是存量用户且还没有 username：

- 登录后仍允许正常使用其它平台能力
- 但发布 skill 时必须先补录 username
- UI 账号面板提供“设置用户名”入口

### 2.4 管理员是官方通道，不是普通 scope 的特判补丁

管理员能力应当清晰表达为：

- 持有 admin 身份可发布官方 scope，例如 `@nextclaw/*`
- 可用于官方维护和治理操作

不要继续靠“谁手里有一个可选 token 就都能直接 upsert”这种方式表达官方性。

### 2.5 普通用户发布默认进入待审核

推荐 V1 直接加发布状态：

- `pending`
- `published`
- `rejected`

管理员发布官方 scope 时可直接 `published`。  
普通用户首次发布或更新默认进入 `pending`，避免 marketplace 变成无人治理公共写库。

## 3. 当前现状与问题

### 3.1 现状

- marketplace worker 当前写接口为 `POST /api/v1/admin/skills/upsert`
- 若未配置 `MARKETPLACE_ADMIN_TOKEN`，写接口实际上不拦截
- skill 元数据中的 `author` 来自客户端 body / `marketplace.json` / `SKILL.md frontmatter`
- 平台账号系统已有 email/password 注册登录与 bearer token
- 平台用户模型尚无 `username`
- 账号面板仅展示 email / role，没有 username 设置入口

### 3.2 核心问题

1. **身份模型缺失**
   - `author` 只是字符串，不是所有权。

2. **唯一命名模型缺失**
   - 目前真正唯一的是裸 `slug`，无法支持多作者生态。

3. **授权边界不清**
   - 目前缺少“普通用户只能改自己的 skill、管理员可发官方”的清晰边界。

4. **治理状态缺失**
   - 缺少待审核/已发布等状态，无法形成发布闭环。

5. **存量用户升级路径缺失**
   - 已注册用户没有 username 补录路径。

## 4. 产品设计

### 4.1 用户可见规则

#### 官方 skill

- 展示发布者：`NextClaw`
- canonical package name：`@nextclaw/<skill-name>`
- 默认可直接公开展示与安装

#### 个人 skill

- 展示发布者：平台账号用户名，必要时可附带显示名或 profile 展示名
- canonical package name：`@<username>/<skill-name>`
- 默认发布后状态为 `pending`
- 仅 `published` 状态对公众 marketplace 列表可见

### 4.2 CLI publish 体验

CLI 保持“命令行就能 publish”的主路径，但前置条件改变：

1. 用户执行 `nextclaw skills publish <dir>`
2. CLI 先检查平台登录态
3. 再检查当前用户是否已有 username
4. 若没有：
   - 返回明确错误
   - 提示前往账号面板或平台页设置 username
5. 若已有：
   - 自动计算默认 package name：`@username/<skill-name>`
6. 若管理员指定官方发布：
   - 仅管理员可使用 `--scope nextclaw` 或同等显式参数

### 4.3 账号面板

账号面板新增：

- Username 展示行
- 未设置时显示显式提示
- “设置用户名 / 修改用户名”入口
- 若正准备发布但用户名缺失，给出明确阻断和下一步动作

## 5. 数据模型设计

### 5.1 平台用户

在平台 `users` 表新增：

- `username TEXT UNIQUE NULL`

规则：

- 初始允许为空，兼容存量用户
- 一旦设置，必须满足校验规则
- 默认先做“设置后不可修改”；如未来需要改名，再单独设计 rename 流程与影响面

推荐校验：

- 仅允许小写字母、数字、短横线
- 长度 `3-32`
- 不能以 `nextclaw`、`admin`、`official` 等保留字开头或完全等于保留字

### 5.2 Marketplace Skill Item

将当前 skill item 从“裸 slug 唯一”升级为以下模型：

```ts
type MarketplaceSkillRecord = {
  id: string;
  ownerUserId: string | null;
  ownerScope: string;           // nextclaw | alice
  skillName: string;            // lark-cli
  packageName: string;          // @alice/lark-cli
  legacySlug: string;           // 兼容字段，可为 lark-cli
  visibility: "public";
  publishStatus: "pending" | "published" | "rejected";
  publishedByType: "admin" | "user";
  name: string;
  summary: string;
  description?: string;
  authorLabel: string;
  tags: string[];
  ...
}
```

唯一约束建议：

- `package_name UNIQUE`
- `(owner_scope, skill_name) UNIQUE`

兼容字段：

- 保留 `slug` 一段时间，但语义改为“兼容安装别名或 legacy lookup key”，不再作为唯一所有权键

### 5.3 文件资产

skill 文件资产继续挂在 skill item 下，不需要单独建新的发布文件模型。  
但 owner / status / canonical package name 必须成为 item 元数据的一部分。

## 6. 权限模型

### 6.1 管理员

可执行：

- 发布或更新 `@nextclaw/*`
- 审核普通用户 skill
- 将 `pending` -> `published`
- 拒绝发布

### 6.2 普通用户

可执行：

- 发布自己的 `@username/*`
- 更新自己的 `@username/*`
- 读取自己的待审核记录

不可执行：

- 发布 `@nextclaw/*`
- 更新他人 scope
- 越权修改已存在但不属于自己的 package

### 6.3 鉴权输入

worker 最终必须支持两条鉴权路径：

1. **平台 bearer token**
   - 用于普通用户发布，也可用于管理员发布
   - 通过平台账号系统解析 user / role / username

2. **admin token**
   - 用于纯运维脚本和官方自动化
   - 仅代表管理权限，不代表普通用户身份

最终授权优先级：

- 若存在 bearer token，以平台身份为准
- 若不存在 bearer token，才允许回退到 admin token

## 7. API 设计

### 7.1 平台账号 API

新增：

- `PATCH /platform/auth/profile`
  - body: `{ username: string }`
  - 仅允许已登录用户调用
  - 成功后返回最新 `user`

`GET /platform/auth/me` 返回补齐：

- `username`
- 可选 `usernameRequiredForPublishing: boolean`

### 7.2 Marketplace 写接口

建议把当前单一 upsert 拆清：

- `POST /api/v1/publisher/skills`
  - 普通用户/管理员通用发布入口
  - 需要 bearer token

- `POST /api/v1/admin/skills/review`
  - 审核入口
  - 需要管理员身份

- `POST /api/v1/admin/skills/upsert`
  - 保留为官方自动化/内部兼容入口
  - 必须要求 admin token 或 admin bearer token，不能再是“可选”

如果希望最小改动，也可先保留 `upsert`，但它内部必须改为：

- bearer token 普通用户路径
- admin token 官方路径
- 并区分 status/owner/allowed scope

### 7.3 Marketplace 读接口

skill 列表与详情返回补齐：

- `packageName`
- `scope`
- `skillName`
- `publishStatus`
- `owner`
- `official: boolean`

普通公开列表默认仅返回：

- `published`

管理员视图或 owner 私有视图再返回：

- `pending`
- `rejected`

## 8. CLI 设计

### 8.1 登录态来源

CLI 复用平台账号 token，不新增第三套 skill publish token。

建议：

- 读取 NextClaw 平台登录 token 的本地存储
- 若不存在，给出 `Please sign in to NextClaw account before publishing skills.`

### 8.2 命令行为

`nextclaw skills publish <dir>`

默认行为：

- 读取当前平台用户
- 若无 username，报错并阻止发布
- 推导默认 `packageName = @username/<skill-name>`
- 服务端返回 `pending` 或 `published`

可选参数：

- `--name`
- `--summary`
- `--description`
- `--tags`
- `--package-name`
- `--scope`

限制：

- 普通用户不能自定义到别人的 scope
- `--scope nextclaw` 仅管理员可用

### 8.3 update 行为

`nextclaw skills update <dir>`

不再以裸 slug 为主键。  
默认应基于：

- 显式 `--package-name`
- 或目录内元数据的 `packageName`
- 否则回退到 `@username/<skill-name>`

## 9. UI 设计

### 9.1 Account Panel

新增：

- `Username` 行
- 未设置时的 warning callout
- `Set username` 按钮
- 设置用户名表单 / 弹层

### 9.2 发布前阻断

若从后续 UI publish 流程触发，也应统一阻断：

- 未登录：先登录
- 未设置 username：先设置 username

### 9.3 Marketplace Card / Detail

展示层改为优先显示：

- 展示名
- `@scope/name`
- 作者标签 / 官方标签
- 发布状态（管理员或本人视角）

## 10. 迁移策略

### 10.1 用户迁移

用户表新增 nullable `username`：

- 不影响现有注册/登录
- 存量用户登录后可继续正常使用
- 仅 publish 时强制补录

### 10.2 skill 数据迁移

对现有 skill item 做分层迁移：

- 官方已有条目迁移为 `@nextclaw/<legacy-slug>` 或按已有来源映射到官方 scope
- 历史第三方 seed 条目若明确已有作者，可迁移到 `@<legacy-author>/<legacy-slug>`；若当前没有对应平台用户，可先保留为 imported external record，但不开放其 owner 更新，后续通过 claim 流程再解决

V1 为了控制范围，推荐：

- 先只把当前仓库维护和官方公开条目统一迁移到 `@nextclaw/*`
- 对历史外部条目标记为 `imported_external = 1` 或同等只读状态
- 暂不做 claim 流程

### 10.3 裸 slug 兼容

安装兼容建议：

- 若用户执行 `nextclaw skills install lark-cli`
  - 优先解析为官方 alias `@nextclaw/lark-cli`
- 若存在歧义的社区同名 skill，不允许靠裸 slug 安装

## 11. 实现任务

### Task 1: 方案文档与边界对齐

**Files:**
- Create: `docs/plans/2026-04-09-platform-username-and-scoped-skill-publishing-plan.md`
- Read: `docs/VISION.md`
- Read: `docs/plans/2026-03-21-nextclaw-account-and-remote-access-product-design.md`

**目标：**
- 让后续实现不再靠口头约定，所有判断可回到文档。

### Task 2: 平台用户 username 数据层

**Files:**
- Modify: `workers/nextclaw-provider-gateway-api/migrations/*.sql`
- Modify: `workers/nextclaw-provider-gateway-api/src/types/platform.ts`
- Modify: `workers/nextclaw-provider-gateway-api/src/repositories/platform-repository.ts`
- Modify: `workers/nextclaw-provider-gateway-api/src/services/platform-auth-service.ts`

**步骤：**
1. 新增 migration，为 `users` 表增加 `username`
2. 为 username 增加唯一索引
3. 更新 `UserRow` / `UserPublicView`
4. 更新 `toUserPublicView`
5. 新增 username 校验与冲突检查

### Task 3: 平台 profile API

**Files:**
- Modify: `workers/nextclaw-provider-gateway-api/src/controllers/auth-controller.ts`
- Modify: `workers/nextclaw-provider-gateway-api/src/routes.ts`
- Modify: 相关测试文件

**步骤：**
1. 给 `me` 返回 username
2. 新增 `PATCH /platform/auth/profile`
3. 写 username 设置/冲突/保留字测试

### Task 4: 账号面板 username 补录

**Files:**
- Modify: `packages/nextclaw-ui/src/account/components/account-panel.tsx`
- Modify: `packages/nextclaw-ui/src/account/managers/account.manager.ts`
- Modify: `packages/nextclaw-ui/src/account/stores/account.store.ts`
- Modify: `packages/nextclaw-ui/src/api/*auth*`

**步骤：**
1. 获取并展示 username
2. 增加设置用户名表单状态
3. 接通 profile update API
4. 补测试

### Task 5: Marketplace skill 模型升级

**Files:**
- Modify: `workers/marketplace-api/migrations/skills/*.sql`
- Modify: `workers/marketplace-api/src/domain/model.ts`
- Modify: `workers/marketplace-api/src/infrastructure/d1-data-source.ts`
- Modify: `workers/marketplace-api/src/main.ts`

**步骤：**
1. 新增 `package_name`、`owner_user_id`、`owner_scope`、`skill_name`、`publish_status`、`published_by_type`
2. 回填官方 scope 数据
3. 读接口返回 canonical package 元数据
4. 公开列表默认过滤 `published`

### Task 6: Marketplace 鉴权与权限控制

**Files:**
- Modify: `workers/marketplace-api/src/main.ts`
- Modify: `workers/marketplace-api/src/infrastructure/d1-data-source.ts`
- New/Modify: 平台 token 验证辅助模块

**步骤：**
1. 强制 admin 写接口不再“可选鉴权”
2. 支持 bearer token 用户身份解析
3. 对普通用户限制 scope 与 ownership
4. 加待审核状态流

### Task 7: CLI publish/update 改造

**Files:**
- Modify: `packages/nextclaw/src/cli/skills/marketplace.ts`
- Modify: `packages/nextclaw/src/cli/skills/marketplace.metadata.ts`
- Modify: CLI 认证/配置读取相关文件
- Modify: `packages/nextclaw/src/cli/skills/marketplace.publish.test.ts`

**步骤：**
1. CLI 获取平台登录 token 与 me 信息
2. 无登录时阻断
3. 无 username 时阻断
4. 默认推导 `@username/skill-name`
5. 管理员可走官方 scope

### Task 8: Marketplace UI 展示对齐

**Files:**
- Modify: `packages/nextclaw-server/src/ui/marketplace.types.ts`
- Modify: `packages/nextclaw-server/src/ui/ui-routes/marketplace/*.ts`
- Modify: `packages/nextclaw-ui/src/api/marketplace.ts`
- Modify: `packages/nextclaw-ui/src/components/marketplace/*.tsx`

**步骤：**
1. 列表/详情返回 packageName 与 status
2. UI 展示 `@scope/name`
3. 管理员/本人视角展示 status

### Task 9: 测试与验证

**Files:**
- Modify/Add: worker tests, CLI tests, UI tests

**最小验证集：**
- 平台 auth 用户名设置测试
- marketplace 权限测试
- CLI publish 登录/username 前置测试
- UI account panel username 设置测试
- 受影响包 `build/lint/tsc`
- marketplace worker 远程 migration + deploy + smoke

## 12. 风险与约束

### 12.1 最大风险

- 现有第三方 seed skill 没有真实平台 owner，对“谁能更新它”需要明确收口。

### 12.2 推荐处理

- 这轮不做自动 claim。
- 非官方、非当前 owner 的历史条目一律先视为只读 imported external。

### 12.3 范围控制

这轮不做：

- 用户名改名流程
- skill claim/transfer
- UI 内完整 publish wizard
- 社区个人页

## 13. 验收标准

同时满足以下条件才算完成：

1. 平台用户可设置唯一 username
2. 存量用户登录后若无 username，可在账号面板补录
3. 普通用户未登录或未设置 username 时无法 publish
4. 普通用户发布得到 `@username/skill-name`
5. 管理员可发布 `@nextclaw/skill-name`
6. marketplace 记录 owner / packageName / status
7. 公开列表默认只展示 `published`
8. CLI / worker / UI 测试通过
9. 远程 migration、deploy、线上 smoke 完成

## 14. 发布与部署闭环

### 14.1 受影响发布面

- `workers/nextclaw-provider-gateway-api`
- `workers/marketplace-api`
- `packages/nextclaw`
- `packages/nextclaw-ui`
- `packages/nextclaw-server`

### 14.2 部署顺序

1. 平台用户库 migration
2. marketplace 技能库 migration
3. build/lint/tsc
4. deploy `nextclaw-provider-gateway-api`
5. deploy `marketplace-api`
6. 线上 smoke：
   - username 设置
   - marketplace 列表读取
   - admin/用户 publish

## 15. 可维护性检查点

实现完成后必须复核：

- 是否已经消除了“author 即身份”的伪模型
- 是否避免了继续保留裸 slug 作为真正唯一键
- 是否把管理员路径和普通用户路径统一收敛到同一权限框架
- 是否避免了再造第二套账号系统
- 是否让发布机制更清楚而不是加更多隐式兼容分支
