# v0.0.1-docs-chat-capabilities-skills-tutorial

## 迭代完成说明（改了什么）

- 文档站新增“对话能力”页面：
  - `apps/docs/zh/guide/chat.md`
  - `apps/docs/en/guide/chat.md`
- 将“对话能力 / Chat Capabilities”加入文档侧栏“功能 / Features”分组。
- 教程新增 `skills` 教程页面：
  - `apps/docs/zh/guide/tutorials/skills.md`
  - `apps/docs/en/guide/tutorials/skills.md`
- 教程总览与侧栏新增 `skills` 教程入口（中英文）。

## 测试/验证/验收方式

- 工程校验：执行 `pnpm build && pnpm lint && pnpm tsc`。
- 文档构建：执行 `pnpm -C apps/docs build`，确认 VitePress 构建通过。
- 文档验收：检查以下链接可访问且文案简洁一致：
  - `/zh/guide/chat`、`/en/guide/chat`
  - `/zh/guide/tutorials/skills`、`/en/guide/tutorials/skills`

## 发布/部署方式

- 文档变更合入后，按项目现有文档流程执行：
  - `pnpm deploy:docs`

## 用户/产品视角的验收步骤

1. 打开中文文档，进入“功能”，确认存在“对话能力”并能看到精简能力清单。
2. 进入“学习与资源 -> Skills 教程”，可看到安装、选择、生效三步。
3. 切换英文文档，确认对应 `Chat Capabilities` 与 `Skills Tutorial` 同步存在且可访问。
