# 2026-02-23 v0.8.12-marketplace-toggle-state-sync

## 背景 / 问题

- Marketplace 中插件启用/禁用状态在 UI 上不稳定，禁用后按钮状态可能不刷新或长期停留在同一文案。
- 用户怀疑其他按钮（安装/卸载）也存在同类“状态未同步”问题。

## 迭代完成说明（改了什么）

- `packages/nextclaw-ui/src/components/marketplace/MarketplacePage.tsx`
  - 启用/禁用按钮改为同时参考 `enabled` 与 `runtimeStatus`，避免单一字段失真导致按钮文案长期不切换。
- `packages/nextclaw-ui/src/hooks/useMarketplace.ts`
  - 安装/管理成功后强制触发 `marketplace-installed` 与 `marketplace-items` 的主动 refetch，确保 UI 状态及时刷新。

## 测试 / 验证 / 验收方式

执行命令：

```bash
pnpm -C packages/nextclaw-ui tsc
pnpm -C packages/nextclaw-ui lint
pnpm build
pnpm lint
pnpm tsc
```

CLI/UI API 冒烟（在临时目录，不写仓库）：

```bash
TMP_HOME=$(mktemp -d /tmp/nextclaw-market-ui-smoke.XXXXXX)
NEXTCLAW_HOME="$TMP_HOME" pnpm -C packages/nextclaw dev:build serve --ui-port 18998

# 观察点：Marketplace API 可用，启用/禁用按钮状态可随操作切换
curl -sf http://127.0.0.1:18998/api/marketplace/installed
curl -sf -X POST http://127.0.0.1:18998/api/marketplace/manage \
  -H 'content-type: application/json' \
  -d '{"type":"plugin","action":"disable","id":"@nextclaw/channel-plugin-discord","spec":"@nextclaw/channel-plugin-discord"}'
curl -sf -X POST http://127.0.0.1:18998/api/marketplace/manage \
  -H 'content-type: application/json' \
  -d '{"type":"plugin","action":"enable","id":"@nextclaw/channel-plugin-discord","spec":"@nextclaw/channel-plugin-discord"}'

rm -rf "$TMP_HOME"
```

## 发布 / 部署方式

- 已执行发布：
  1. `pnpm release:version`
  2. `pnpm release:publish`
- 发布结果：
  - `@nextclaw/ui@0.5.4`
  - `nextclaw@0.8.8`
- 本次不涉及数据库变更，无 migration 需求。

## 用户 / 产品视角的验收步骤

1. 进入 UI 的 Marketplace 页面。
2. 选择一个已安装的插件（如 Discord）。
3. 点击 `Disable`，按钮应切换为 `Enable`。
4. 点击 `Enable`，按钮应切回 `Disable`。
5. 执行 `Uninstall`，确认按钮与列表状态刷新。

## 影响范围 / 风险

- 影响范围：`@nextclaw/ui`。
- Breaking change：否。
- 风险：UI 状态刷新频率增加（多一次 refetch），风险低。
