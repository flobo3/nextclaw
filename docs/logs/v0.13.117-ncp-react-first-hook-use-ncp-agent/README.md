# v0.13.117-ncp-react-first-hook-use-ncp-agent

## 迭代完成说明（改了什么）

- 将 `apps/ncp-demo/frontend` 中的 `useNcpAgent` 迁移到 `@nextclaw/ncp-react`，作为该包的第一个真实能力。
- `@nextclaw/ncp-react` 新增 `src/hooks/use-ncp-agent.ts`，并通过 `src/hooks/index.ts` 与 `src/index.ts` 对外导出。
- demo 前端改为直接从 `@nextclaw/ncp-react` 引用 `useNcpAgent`，删除本地重复实现。
- 调整相关依赖：`ncp-react` 增加对 `@nextclaw/ncp`、`@nextclaw/ncp-toolkit` 的依赖；demo 前端增加 `@nextclaw/ncp-react` 依赖并移除不再直接使用的 `@nextclaw/ncp-toolkit`。

## 测试/验证/验收方式

- 执行 `pnpm install`
- 执行 `pnpm -C packages/ncp-packages/nextclaw-ncp-react lint`
- 执行 `pnpm -C packages/ncp-packages/nextclaw-ncp-react tsc`
- 执行 `pnpm -C packages/ncp-packages/nextclaw-ncp-react build`
- 执行 `pnpm -C apps/ncp-demo/frontend lint`
- 执行 `pnpm -C apps/ncp-demo/frontend tsc`
- 执行 `pnpm -C apps/ncp-demo/frontend build`

## 发布/部署方式

- 当前无需单独发布；后续随 NCP 相关包统一进入既有 NPM 发布流程。

## 用户/产品视角的验收步骤

1. 打开 `packages/ncp-packages/nextclaw-ncp-react/src/hooks/use-ncp-agent.ts`，确认 hook 已在库内实现。
2. 打开 `apps/ncp-demo/frontend/src/App.tsx`，确认 demo 已从 `@nextclaw/ncp-react` 引用该 hook。
3. 启动 ncp demo，发送一条消息，确认流式消息展示、停止和继续拉流行为与迁移前一致。
