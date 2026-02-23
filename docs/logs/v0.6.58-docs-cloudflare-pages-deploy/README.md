# v0.6.58-docs-cloudflare-pages-deploy

## 迭代完成说明（改了什么）

本次完成“文档站 + UI 微浏览器”的上线收尾，重点解决部署、域名接入与可用性兜底。

1. 文档站（Cloudflare Pages）
   - 创建并接入 Pages 项目：`nextclaw-docs`（production branch: `master`）。
   - 完成部署并产出可访问预览：`https://32870701.nextclaw-docs.pages.dev`。
   - 绑定自定义域名：`docs.nextclaw.io`（状态：`pending`，等待 CNAME 生效）。
2. 部署脚本稳定性
   - 将 `package.json` 的 `deploy:docs` / `deploy:pages` 从 `npx wrangler` 切换为 `pnpm dlx wrangler`，解决本地环境下 `wrangler: command not found` 的不稳定问题。
3. 文档站资源修复
   - 新增 `packages/docs/public/logo.svg`，修复线上文档站 Logo 404。
4. 微浏览器可用性兜底
   - 微浏览器默认文档入口调整为 `https://nextclaw-docs.pages.dev`，避免自定义域名证书未就绪时 iframe 空白。
   - 链接拦截支持 `docs.nextclaw.io` 与 `nextclaw-docs.pages.dev` 两个域名。

## 测试 / 验证 / 验收方式

### 工程验证

- `pnpm build`
- `pnpm lint`
- `pnpm tsc`

结果：通过。

关键观察点：

- 无 TypeScript / lint error（存在历史 lint warning，无新增 error）；
- UI 与 CLI 相关包均完成构建。

### 部署验证

- `pnpm deploy:docs`
- `npx wrangler pages deployment list --project-name nextclaw-docs`

结果：通过。

关键观察点：

- `vitepress build` 成功；
- `wrangler pages deploy` 返回 `Deployment complete`；
- 产出预览地址：`https://32870701.nextclaw-docs.pages.dev`。

### 冒烟测试（用户可见）

- `curl -sS -o /tmp/nextclaw_docs_home.html -w '%{http_code}\n' https://nextclaw-docs.pages.dev`
- `curl -sS -o /tmp/nextclaw_docs_logo.svg -w '%{http_code}\n' https://nextclaw-docs.pages.dev/logo.svg`
- `curl -sS -o /tmp/docs_custom.html -w '%{http_code}\n' https://docs.nextclaw.io`

结果：

- `nextclaw-docs.pages.dev` 通过；
- `docs.nextclaw.io` 待生效（当前证书握手失败，Cloudflare 返回 CNAME 未就绪）。

关键观察点：

- Pages 默认域名首页 `HTTP 200`；
- Logo 资源 `HTTP 200`；
- 自定义域名在 Pages API 中状态为 `pending`，提示 `CNAME record not set`。

## 用户/产品视角验收步骤

1. 打开 `https://nextclaw-docs.pages.dev`。
2. 确认首页可访问，展示 `NextClaw` 标题、Hero 与导航。
3. 点击顶部 `Guide` / `Channels`，确认可正常跳转。
4. 在 UI 侧边栏点击“帮助文档”，确认微浏览器面板可打开，并能加载文档页面。
5. （域名生效后）打开 `https://docs.nextclaw.io` 再次验证相同行为。

通过标准：站点可访问、导航可用、微浏览器可读文档；自定义域名最终可用。

## 发布 / 部署方式

1. 安装依赖：`pnpm install`
2. 执行部署：`pnpm deploy:docs`

补充：

- 若首次部署报 `Project not found`，先创建项目：
  - `npx wrangler pages project create nextclaw-docs --production-branch master`
- 绑定自定义域名：
  - `POST /accounts/{account}/pages/projects/nextclaw-docs/domains` with `{"name":"docs.nextclaw.io"}`
- 若域名一直 `pending`，需在 DNS 将 `docs.nextclaw.io` 的 CNAME 指向 `nextclaw-docs.pages.dev`，待证书签发后恢复正常。

然后重新执行 `pnpm deploy:docs`。
