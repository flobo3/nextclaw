# 2026-02-28 v0.0.1-secrets-docs-guide

## 迭代完成说明（改了什么）

- 新增文档站 Secrets 专题页：
  - `apps/docs/en/guide/secrets.md`
  - `apps/docs/zh/guide/secrets.md`
- 新增文档站导航入口（EN/ZH 顶部导航 + 侧边栏）。
- 在以下文档中补充 Secrets 专题跳转：
  - `apps/docs/en/guide/getting-started.md`
  - `apps/docs/zh/guide/getting-started.md`
  - `apps/docs/en/guide/configuration.md`
  - `apps/docs/zh/guide/configuration.md`
  - `apps/docs/en/guide/commands.md`
  - `apps/docs/zh/guide/commands.md`
- 专题页覆盖：为什么要用 secrets、真实存储位置、典型场景、可照抄步骤、UI 路径、旧方式兼容说明。

## 测试 / 验证 / 验收方式

```bash
PATH=/opt/homebrew/bin:$PATH pnpm build
PATH=/opt/homebrew/bin:$PATH pnpm lint
PATH=/opt/homebrew/bin:$PATH pnpm tsc
PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/docs build
```

文档冒烟检查：

```bash
test -f apps/docs/.vitepress/dist/en/guide/secrets.html
test -f apps/docs/.vitepress/dist/zh/guide/secrets.html
rg -n "Secrets Management" apps/docs/.vitepress/dist/en/guide/secrets.html
rg -n "密钥管理" apps/docs/.vitepress/dist/zh/guide/secrets.html
```

## 发布 / 部署方式

- 文档站发布命令：

```bash
PATH=/opt/homebrew/bin:$PATH pnpm deploy:docs
```

- 若命令执行环境缺少 Cloudflare 凭证，则发布会失败，需补充凭证后重试。

## 用户 / 产品视角的验收步骤

1. 打开文档站英文页，确认可从导航进入 `Secrets` 页面。
2. 打开中文页，确认可从导航进入“密钥管理”页面。
3. 在专题页中按“最小步骤”复制命令，能完成 `configure -> apply -> audit -> reload`。
4. 在“配置/命令/快速开始”页面中可看到 Secrets 专题链接并可跳转。
