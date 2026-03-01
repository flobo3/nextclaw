# Validation

## 自动验证

```bash
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui lint
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc
PATH=/opt/homebrew/bin:$PATH pnpm release:frontend
```

结果：

- `build` 通过
- `lint` 通过（仅既有 warning，无新增 error）
- `tsc` 通过
- `release:frontend` 完成并发布成功

## 冒烟测试（隔离目录，避免写入仓库）

```bash
TMP_HOME=$(mktemp -d /tmp/nextclaw-ui-layout-smoke.XXXXXX)
NEXTCLAW_HOME="$TMP_HOME" PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw dev:build start --ui-port 19181
curl -sf http://127.0.0.1:19181/ > /tmp/nextclaw-ui-layout-smoke-ui.html
NEXTCLAW_HOME="$TMP_HOME" PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw dev:build stop

TMP_HOME=$(mktemp -d /tmp/nextclaw-ui-layout-smoke-meta.XXXXXX)
NEXTCLAW_HOME="$TMP_HOME" PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw dev:build start --ui-port 19182
curl -sf http://127.0.0.1:19182/api/config/meta > /tmp/nextclaw-ui-layout-smoke-meta.json
NEXTCLAW_HOME="$TMP_HOME" PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw dev:build stop
```

观察点：

- UI 首页可返回 HTML 内容（本次实测 `528 bytes`）。
- `/api/config/meta` 正常返回含 `channels/providers` 的 JSON（本次实测 `4580 bytes`）。
