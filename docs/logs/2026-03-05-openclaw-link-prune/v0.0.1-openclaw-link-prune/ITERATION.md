# v0.0.1-openclaw-link-prune

## 迭代完成说明（改了什么）

按最新要求对文档做“克制化收缩”：

1. 从 `after-setup` 页面移除 OpenClaw 官方文档与仓库讨论链接（中英文）。
2. 从 `resources` 页面移除 OpenClaw 仓库相关条目（中英文），仅保留非 OpenClaw 的 skills 资源。
3. 在页面中明确标注：OpenClaw 相关链接后续由用户手动补充。

修改文件：

- `apps/docs/zh/guide/after-setup.md`
- `apps/docs/en/guide/after-setup.md`
- `apps/docs/zh/guide/resources.md`
- `apps/docs/en/guide/resources.md`

## 测试/验证/验收方式

执行：

1. `pnpm build`
2. `pnpm lint`
3. `pnpm tsc`
4. `pnpm --filter @nextclaw/docs build`

本地结果（2026-03-05）：

1. `pnpm build`：通过
2. `pnpm lint`：通过（仅存在历史 warning，无 error）
3. `pnpm tsc`：通过
4. `pnpm --filter @nextclaw/docs build`：通过

验收点：

1. `after-setup` 不再出现 `docs.openclaw.ai` 与 `openclaw/openclaw` 链接。
2. `resources` 不再出现 `openclaw/skills`、`awesome-openclaw-*` 等 OpenClaw 仓库条目。
3. 中英文页面结构一致。

## 发布/部署方式

仅 docs 改动，无后端/数据库迁移。

1. 本地验证通过后执行：`pnpm deploy:docs`
2. 发布后检查：
   - `/zh/guide/after-setup`
   - `/en/guide/after-setup`
   - `/zh/guide/resources`
   - `/en/guide/resources`

## 用户/产品视角的验收步骤

1. 打开“配置后做什么”，确认不再看到 OpenClaw 文档/仓库链接。
2. 打开“生态资源”，确认 OpenClaw 仓库相关条目已移除。
3. 确认页面仍保留可用的 skills 资源骨架，便于后续手动补充。
