# v0.14.301-cron-notes-docs-publish

## 迭代完成说明

- 在文档站 `Notes` 栏目新增一篇面向用户的 cron 升级说明，覆盖这轮定时任务相关优化：
  - 默认可见全部任务（含 disabled）
  - `disable` 与 `remove` 语义分离
  - 一次性任务改为明确强调 `at`
  - AI 调度时明确区分“执行指令”与“最终发送文案”
- 同步新增英文版 Note，保证中英文文档站一致。
- 更新 `Notes` 首页与 VitePress notes sidebar，让新文稿可以从导航直接进入。

## 测试/验证/验收方式

- 文档构建验证：
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/docs build`
  - 结果：通过。
- 可维护性检查：
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:$PATH node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths apps/docs/.vitepress/config.ts apps/docs/en/notes/index.md apps/docs/en/notes/2026-03-31-cron-clarity-and-one-shot-upgrade.md apps/docs/zh/notes/index.md apps/docs/zh/notes/2026-03-31-cron-clarity-and-one-shot-upgrade.md`
  - 结果：按规则判定为“不适用”，因为本轮主要为文档与文案更新。

## 发布/部署方式

- 执行文档站发布：
  - `PATH=$HOME/.nvm/versions/node/v22.16.0/bin:$PATH pnpm deploy:docs`
- 结果：Cloudflare Pages 部署完成。
- 本次部署地址：
  - `https://a2c0bc5c.nextclaw-docs.pages.dev`

## 用户/产品视角的验收步骤

1. 打开文档站 `Notes` 页面，确认能看到 2026-03-31 的 cron 更新笔记。
2. 分别进入中文与英文页面，确认内容都可访问且导航入口存在。
3. 检查文稿是否清楚表达：
  - 默认可见 disabled cron
  - `disable` 不等于 `remove`
  - 一次性任务应使用 `at`
  - AI 创建渠道发送类任务时，`message` 应写执行指令而不是只写文案正文
4. 从文稿中的链接跳转到 cron 指南和命令参考，确认链接可正常工作。
