# v0.12.48-docs-provider-entry-options

> Supersedes `v0.12.47-docs-minimax-first-provider-guide` and is the final user-facing wording for this topic.

## 迭代完成说明（改了什么）

- 将“安装后第一步”文档从“单点 MiniMax”调整为“先选接入方式”，明确两条路径：
  1. `Qwen Portal`（免手动 API Key，但可能限流）
  2. `AI 厂商 API Key`（以 MiniMax 为示例，强调仅示例、非强绑定）
- 教程路由从 `/guide/tutorials/minimax` 调整为 `/guide/tutorials/provider-options`：
  - `apps/docs/zh/guide/tutorials/provider-options.md`
  - `apps/docs/en/guide/tutorials/provider-options.md`
- 同步更新文档入口与导航文案，去掉“第一步=MiniMax”的表达：
  - `apps/docs/.vitepress/config.ts`
  - `apps/docs/zh/guide/tutorials.md`
  - `apps/docs/en/guide/tutorials.md`
  - `apps/docs/zh/guide/getting-started.md`
  - `apps/docs/en/guide/getting-started.md`
  - `apps/docs/zh/guide/after-setup.md`
  - `apps/docs/en/guide/after-setup.md`

## 测试/验证/验收方式

- 文档构建：`pnpm --filter @nextclaw/docs build`
- 文档双语镜像校验：`pnpm docs:i18n:check`
- 关键验收点：
  - 文档站“教程总览 / 侧边栏 / 快速开始 / 配置后做什么”都指向新页面 `/guide/tutorials/provider-options`；
  - 新页面明确两条接入路径与取舍，不再将 MiniMax 描述为唯一第一步；
  - 中英文页面镜像通过。

## 发布/部署方式

- 本次为 docs-only 变更，合并后执行：`pnpm deploy:docs`
- 不涉及后端、数据库、migration、服务部署。

## 用户/产品视角的验收步骤

1. 新用户完成安装后进入文档站“快速开始”。
2. 在“首次配置”处看到“先选接入方式（Qwen Portal 或 API Key）”入口。
3. 若想最快跑通，按 Qwen Portal 路径完成授权并发送测试消息。
4. 若追求长期稳定，按 API Key 路径配置厂商（示例 MiniMax）并发送测试消息。
5. 成功后继续进入“配置后做什么”完成渠道接入和后续使用。
