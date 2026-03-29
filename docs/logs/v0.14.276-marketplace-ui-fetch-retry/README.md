# v0.14.276-marketplace-ui-fetch-retry

## 迭代完成说明

- 在 [`packages/nextclaw-server/src/ui/router/marketplace/catalog.ts`](../../../packages/nextclaw-server/src/ui/router/marketplace/catalog.ts) 为 marketplace 纯读代理链路增加显式网络重试，覆盖 skills / plugins / mcp 的 catalog、detail、content、recommendation 等上游读取。
- 新增 [`packages/nextclaw-server/src/ui/router/marketplace/marketplace-network-retry.ts`](../../../packages/nextclaw-server/src/ui/router/marketplace/marketplace-network-retry.ts)，只对瞬时网络错误（如 `ECONNRESET`、`ETIMEDOUT`、`ENOTFOUND`、`fetch failed`）做有限指数退避重试，不对 HTTP 错误做隐藏 fallback。
- 在 [`packages/nextclaw-server/src/ui/router.marketplace-content.test.ts`](../../../packages/nextclaw-server/src/ui/router.marketplace-content.test.ts) 增加回归用例，覆盖“首次 marketplace 请求 `ECONNRESET`、随后成功”时，`/api/marketplace/skills/items` 仍返回 `200` 的场景。

## 测试/验证/验收方式

```bash
pnpm -C packages/nextclaw-server exec vitest run src/ui/router.marketplace-content.test.ts
pnpm -C packages/nextclaw-server lint
pnpm -C packages/nextclaw-server tsc
pnpm -C packages/nextclaw-server build
```

- 冒烟验证：
  - 通过本地 `createUiRouter` 路由冒烟，模拟首个 marketplace 上游请求抛出 `TypeError: fetch failed` 且 `cause.code = ECONNRESET`，随后再次请求成功。
  - 观察结果为：`status = 200`、`ok = true`、`total = 1`、`calls = 2`。

## 发布/部署方式

- 若仅本地验证，重新构建依赖 `@nextclaw/server` 的运行入口即可生效。
- 若要让已安装的 NextClaw 前端/桌面端用户获得该修复，需要按项目既有发布流程发布包含本次 `@nextclaw/server` 变更的上层产物。

## 用户/产品视角的验收步骤

1. 打开 NextClaw 本地前端的 skill marketplace 页面。
2. 连续刷新或多次切换到 `Skills` 页签。
3. 确认页面不再间歇性展示“加载技能市场数据失败: fetch failed”。
4. 打开 `lark-cli` 等 skill 详情，确认列表和详情都能正常加载。
