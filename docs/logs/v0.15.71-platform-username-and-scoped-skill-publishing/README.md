# v0.15.71-platform-username-and-scoped-skill-publishing

## 迭代完成说明

- 完成平台账号 `username` 机制的产品方案与实现落地，方案文档见 [Platform Username And Scoped Skill Publishing Implementation Plan](../../plans/2026-04-09-platform-username-and-scoped-skill-publishing-plan.md)。
- 平台账号侧新增 `PATCH /platform/auth/profile`，支持已登录用户补录唯一用户名；CLI `platform auth me` / 本地账号面板同步返回并展示 `username`。
- 本地账号面板新增用户名展示、设置入口与缺失提示，存量用户可在已有登录态下补录用户名。
- marketplace skill 发布模型升级为 canonical `packageName`：
  - 官方 skill：`@nextclaw/<skill-name>`
  - 个人 skill：`@<username>/<skill-name>`
- marketplace 发布权限与状态补齐：
  - 官方 scope 仅 admin 可发
  - 普通用户必须登录且必须已有 username
  - 普通用户发布默认进入 `pending`
- CLI `skills publish` / `skills install` 已支持 scoped selector、scoped package name、用户名前置校验与更清晰的参数拆分。
- 新增官方 marketplace skill [publish-to-nextclaw-marketplace](../../../skills/publish-to-nextclaw-marketplace/SKILL.md)，把“发布到 NextClaw marketplace”沉淀为可安装的产品能力，并在 skill 内明确要求 `nextclaw >= v0.17.6`。
- marketplace 数据访问层完成一次收敛式重构：
  - skill datasource 从大文件拆到独立 data source / file store / payload parser
  - runtime 内 publish/update 参数翻译外提，减少主运行时继续膨胀

## 测试/验证/验收方式

已完成验证：

```bash
PATH=/opt/homebrew/bin:$PATH pnpm -C workers/marketplace-api tsc
PATH=/opt/homebrew/bin:$PATH pnpm -C workers/marketplace-api build
PATH=/opt/homebrew/bin:$PATH pnpm -C workers/nextclaw-provider-gateway-api tsc
PATH=/opt/homebrew/bin:$PATH pnpm -C workers/nextclaw-provider-gateway-api build
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw build
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw exec vitest run src/cli/skills/marketplace.publish.test.ts
python3 .agents/skills/marketplace-skill-publisher/scripts/validate_marketplace_skill.py --skill-dir skills/publish-to-nextclaw-marketplace
PATH=/opt/homebrew/bin:$PATH pnpm -C workers/marketplace-api exec wrangler secret list --config wrangler.toml
NEXTCLAW_MARKETPLACE_ADMIN_TOKEN=*** PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw exec tsx src/cli/index.ts skills publish /Users/peiwang/Projects/nextbot/skills/publish-to-nextclaw-marketplace --meta /Users/peiwang/Projects/nextbot/skills/publish-to-nextclaw-marketplace/marketplace.json --scope nextclaw --api-base https://marketplace-api.nextclaw.io
curl -sS https://marketplace-api.nextclaw.io/api/v1/skills/items/%40nextclaw%2Fpublish-to-nextclaw-marketplace
tmp_dir=$(mktemp -d /tmp/nextclaw-marketplace-publish-skill.XXXXXX)
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw exec tsx src/cli/index.ts skills install @nextclaw/publish-to-nextclaw-marketplace --api-base https://marketplace-api.nextclaw.io --workdir "$tmp_dir"
PATH=/opt/homebrew/bin:$PATH node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs
PATH=/opt/homebrew/bin:$PATH node scripts/lint-new-code-governance.mjs
```

验证结果：

- `marketplace-api` / `nextclaw-provider-gateway-api` / `nextclaw` / `nextclaw-ui` 相关构建与类型检查通过。
- `marketplace.publish.test.ts` 精确执行通过，`2` 个测试全部通过。
- 新增 marketplace skill `publish-to-nextclaw-marketplace` 的本地元数据校验通过。
- `workers/marketplace-api` 的 secret list 已确认存在 `MARKETPLACE_ADMIN_TOKEN`。
- 官方 skill `@nextclaw/publish-to-nextclaw-marketplace` 已成功 publish，返回 `Files: 2`。
- 远端 item 校验通过：`GET /api/v1/skills/items/publish-to-nextclaw-marketplace` 与 `GET /api/v1/skills/items/%40nextclaw%2Fpublish-to-nextclaw-marketplace` 均返回 `200`，`publishStatus=published`、`publishedByType=admin`、`install.kind=marketplace`。
- 安装冒烟通过：CLI 已在临时目录真实安装 `@nextclaw/publish-to-nextclaw-marketplace`，并确认装下来的 `SKILL.md` 中包含 `v0.17.6` 版本门槛说明。
- maintainability guard 与 new-code governance 通过；仅保留仓库既有 warning，无新增 hard error。
- 线上自动 smoke 结果：
  - `GET https://ai-gateway-api.nextclaw.io/health` 返回 `200`
  - `POST https://ai-gateway-api.nextclaw.io/platform/auth/browser/start` 返回 `200`，可正常创建浏览器授权会话
  - `GET https://marketplace-api.nextclaw.io/health` 返回 `200`
  - 使用本机已过期 bearer token 访问 `GET /platform/auth/me`、`PATCH /platform/auth/profile`、`POST /api/v1/skills/publish` 时均正确返回 `401`，说明线上鉴权边界生效

未纳入本次通过结论：

- `pnpm -C packages/nextclaw test -- --run marketplace.publish.test.ts` 曾误触发更大范围 vitest 套件，命中仓库内其他既有失败，不作为本次功能回归失败判定。
- 本机仍没有可复用的有效平台登录 token，因此没有补做“基于平台账号登录态”的正向 profile 写接口 smoke；但本次已通过新增的 `MARKETPLACE_ADMIN_TOKEN` 完成官方 skill publish 正向闭环。

## 发布/部署方式

本次先排查并清理了平台 D1 容量问题，再完成远端 migration / deploy。

根因结论：

- `NEXTCLAW_PLATFORM_DB` 在清理前大小约为 `500,011,008` 字节，已经撞满 500MB 上限。
- 主因不是业务主表，而是 `audit_logs`。
- `audit_logs` 中有 `373,783` 行，其中：
  - `remote.instance.updated`：`361,613`
  - `remote.device.updated`：`11,907`
- 审计日志几乎全部来自 remote register 高频更新，且带有较大的前后状态 JSON。

```bash
PATH=/opt/homebrew/bin:$PATH wrangler d1 execute NEXTCLAW_PLATFORM_DB --remote --command "DELETE FROM audit_logs WHERE action IN ('remote.instance.updated', 'remote.device.updated');"
```

- 远端实际删除了 `373,520` 条高频低价值审计日志。
- 清理后平台库 `size_after` 从 `500,011,008` 降到约 `831,488`，恢复可写。

```bash
PATH=/opt/homebrew/bin:$PATH pnpm -C workers/nextclaw-provider-gateway-api db:migrate:remote
PATH=/opt/homebrew/bin:$PATH pnpm -C workers/marketplace-api db:migrate:remote
PATH=/opt/homebrew/bin:$PATH pnpm -C workers/nextclaw-provider-gateway-api run deploy
PATH=/opt/homebrew/bin:$PATH pnpm -C workers/marketplace-api run deploy
```

- 平台侧 `0012_users_username.sql` 远端 migration 已成功执行。
- marketplace skills D1 的 `0004_scoped_skill_publishing_20260409.sql` 已成功应用。
- `nextclaw-provider-gateway-api` 已成功 deploy 到 `ai-gateway-api.nextclaw.io`。
- `nextclaw-marketplace-api` 已成功 deploy 到 `marketplace-api.nextclaw.io`。

部署后补充确认：

- `audit_logs` 当前仅剩 `328` 行，库大小稳定在 `868,352` 字节量级。
- `users` 表远端 schema 已包含 `username TEXT` 列。
- 2026-04-10 补充收尾：
  - `workers/marketplace-api` 远端 secret 初始为空数组 `[]`，说明此前确实未配置 `MARKETPLACE_ADMIN_TOKEN`。
  - 已新增远端 secret `MARKETPLACE_ADMIN_TOKEN`。
  - 已通过 admin token 正式发布官方 skill `@nextclaw/publish-to-nextclaw-marketplace`。
  - 发布后远端 item 校验和安装冒烟均已完成。

## 用户/产品视角的验收步骤

在本地或可写的目标环境完成部署后，可按以下步骤验收：

1. 以普通平台用户登录账号面板，确认能看到 `username` 状态；若未设置，界面会提示先设置用户名。
2. 在账号面板设置唯一用户名，例如 `alice`，保存后再次进入个人资料，确认用户名已展示且不可随意改写。
3. 在 CLI 登录同一平台账号后执行 skill publish，默认 package name 应解析为 `@alice/<skill-name>`。
4. 使用普通用户发布 skill，确认返回结果为成功入库且状态为 `pending`。
5. 使用 admin 身份发布或审核 skill，确认 `@nextclaw/<skill-name>` 可直接发布，普通用户 skill 可从 `pending` 转为 `published`。
6. 使用 CLI install scoped selector，确认 `@nextclaw/<skill-name>` 与 `@alice/<skill-name>` 都能按 canonical package name 安装。
7. 在 marketplace 中搜索或直接安装 `@nextclaw/publish-to-nextclaw-marketplace`，确认 skill 文案里明确写出 `nextclaw >= v0.17.6` 才支持该发布流程。

## 可维护性总结汇总

### 长期目标对齐 / 可维护性推进

- 这次改动顺着“统一入口 + 能力可治理”的长期方向前进了一步：skill 发布不再只是匿名文本作者，而是收敛到平台身份、正式 package name 和显式发布状态。
- 本次顺手减债：是。
- 主要减债点不是新增功能点本身，而是把 marketplace skill 发布从“无治理 upsert”收敛成“身份、scope、状态、文件资产”职责更清晰的一套模型，同时把过大的 datasource 继续拆分，避免 runtime 和基础设施文件继续失控膨胀；另外补了一次真实线上减债，把 remote 高频噪音审计日志清掉，并停止对重复 register 刷新继续写大体积 audit record。

### 可维护性复核结论

- 可维护性复核结论：保留债务经说明接受
- 本次顺手减债：是
- no maintainability findings

### 代码增减报告

- 新增：2562 行
- 删除：1395 行
- 净增：+1167 行

### 非测试代码增减报告

- 新增：2554 行
- 删除：1392 行
- 净增：+1162 行

### 可维护性判断

- 本次是否已尽最大努力优化可维护性：是。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。最明显的动作是把 marketplace skill 数据层从单点大文件拆成更明确的 data source / payload / file store 边界，同时从 CLI runtime 中抽出 publish 参数翻译逻辑，并在平台侧去掉“每次 remote register 都写审计日志”的噪音路径，属于“先收敛结构再继续加能力”。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：目录平铺度和职责边界明显改善，但总代码量与文件数净增长。该增长的最小必要性在于这次确实新增了一整套正式身份、scope、审核状态与账号补录链路；与此同时同步删除/收敛了旧 datasource 内的大量内联实现与 runtime 拼装逻辑，并在线上实际删除了 `373,520` 条低价值审计日志，避免把系统继续推向不可维护状态。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。新增抽象集中在 marketplace skill 发布链路的稳定边界，没有再叠一层临时 adapter；平台侧则沿用现有 auth/profile/service 结构补能力，没有分叉出第二套账号体系。
- 目录结构与文件组织是否满足当前项目治理要求：基本满足。本次新增文件主要落在既有模块边界内，marketplace skill 基础设施目录比改动前更清晰；仍需关注 worker 相关目录整体体量，但本次没有继续恶化平铺。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：已按该要求执行；以上结论基于独立复核，不以 guard 通过替代结构判断。

### 保留债务与下一步入口

- `username` 的数据库唯一索引未在本次远端落地；当前实现依赖应用层冲突检查，后续可在库容量稳定后补上 DB 级唯一约束。
- 当前自动 smoke 仍缺“有效登录身份下的正向写接口验证”，阻塞点不是服务异常，而是本机仅存有过期 token，且没有可读取的 admin secret。
