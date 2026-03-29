# v0.14.277-marketplace-fetch-retries-release

## 迭代完成说明

- 为本次 marketplace 重试修复创建联动 changeset，覆盖 `@nextclaw/server`、`@nextclaw/remote`、`nextclaw`，保证公开依赖链发布后版本一致。
- 已完成标准 npm 发布闭环：`release:version -> release:publish`。
- 实际发布结果：
  - `@nextclaw/server@0.11.8`
  - `@nextclaw/remote@0.1.60`
  - `nextclaw@0.16.13`
- `release:version` 过程中，`apps/desktop` 作为私有应用被同步更新到内部依赖对齐版本，但不参与 npm 发包。
- 本迭代承接前两个功能迭代：
  - [`v0.14.275-marketplace-fetch-retry`](../v0.14.275-marketplace-fetch-retry/README.md)
  - [`v0.14.276-marketplace-ui-fetch-retry`](../v0.14.276-marketplace-ui-fetch-retry/README.md)

## 测试/验证/验收方式

```bash
pnpm -C packages/nextclaw exec vitest run src/cli/skills/marketplace.install.test.ts
pnpm -C packages/nextclaw-server exec vitest run src/ui/router.marketplace-content.test.ts
pnpm -C packages/nextclaw lint
pnpm -C packages/nextclaw tsc
pnpm -C packages/nextclaw build
pnpm -C packages/nextclaw-server lint
pnpm -C packages/nextclaw-server tsc
pnpm -C packages/nextclaw-server build
pnpm release:version
pnpm release:publish
```

- 真实冒烟：
  - 通过 `packages/nextclaw-server` 的 `dist` 路由连续请求真实 marketplace skills 列表与 `lark-cli` 详情，确认多次返回 `200`。
  - 通过 `packages/nextclaw/dist/cli/index.js skills install lark-cli --workdir <tmp>` 验证真实安装成功。
  - 通过本地 `POST /api/marketplace/skills/install` 路由验证 UI 安装链路成功落盘。
- 发布结果：
  - `changeset publish` 输出 `packages published successfully`
  - 本地 tag 已生成：`@nextclaw/server@0.11.8`、`@nextclaw/remote@0.1.60`、`nextclaw@0.16.13`

## 发布/部署方式

- 按仓库标准流程执行 `pnpm release:version` 与 `pnpm release:publish`。
- 本次仅涉及 npm 包发布，不涉及数据库 migration、Cloudflare Worker 部署或前端单独页面发布。

## 用户/产品视角的验收步骤

1. 升级到本次发布后的 `nextclaw` 版本。
2. 打开本地 Skills Marketplace，多次刷新或切换页签，确认不再间歇性出现“加载技能市场数据失败: fetch failed”。
3. 在 CLI 执行 `nextclaw skills install lark-cli`，确认能稳定安装成功。
4. 在 UI 中安装 `lark-cli`，确认返回成功且工作区出现 `skills/lark-cli/SKILL.md`。
