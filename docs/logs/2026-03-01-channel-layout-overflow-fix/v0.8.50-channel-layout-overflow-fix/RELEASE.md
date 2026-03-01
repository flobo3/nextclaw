# Release

## 发布方式

本次为 UI 变更，按项目规范使用前端一键发布：

```bash
PATH=/opt/homebrew/bin:$PATH pnpm release:frontend
```

该命令执行内容：

1. 自动创建 UI changeset（`@nextclaw/ui` + `nextclaw`）
2. 执行 `pnpm release:version`
3. 执行 `pnpm release:publish`

## 发布结果

- Published: `@nextclaw/ui@0.5.37`
- Published: `nextclaw@0.8.50`
- Tags: `@nextclaw/ui@0.5.37`, `nextclaw@0.8.50`

## 不适用项

- 远程 migration：不适用（本次仅 UI / 前端相关变更）。
