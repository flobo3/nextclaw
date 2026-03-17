# 迭代完成说明

本次完成了 NCP Phase 2 前端链路的纠偏与落地，核心目标是把错误的“把 NCP 重新适配回 legacy runtime”方案收回，改为真正基于 NCP 自身积木来构建独立前端链路。

本次改动包括：

- 在 [ChatPage.tsx](../../../../packages/nextclaw-ui/src/components/chat/ChatPage.tsx) 建立唯一前端切换点，通过 `legacy/ncp` 两条页面编排链路做明确分离。
- 保留 [LegacyChatPage.tsx](../../../../packages/nextclaw-ui/src/components/chat/legacy/LegacyChatPage.tsx) 继续承载旧链路。
- 将 [NcpChatPage.tsx](../../../../packages/nextclaw-ui/src/components/chat/ncp/NcpChatPage.tsx) 改为直接基于 `@nextclaw/ncp-react` 的 `useHydratedNcpAgent`、`@nextclaw/ncp-http-agent-client` 的 `NcpHttpAgentClientEndpoint` 来组装运行时。
- 删除错误方向的 NCP 反向适配层：
  - `ncp-runtime-agent.ts`
  - `ncp-parsers.ts`
  - `ncp-chat-page-runtime.ts`
- 保留共享展示层不变，继续复用现有 chat 展示组件，只在 NCP 页面内做薄的 view-model / session 适配。
- 补充 NCP 前端所需的 session API、types、hooks，以及新的 NCP 输入编排管理器。

# 测试/验证/验收方式

已执行：

- `PATH=/opt/homebrew/bin:$PATH pnpm install`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui build`

说明：

- `tsc` 通过。
- `build` 通过。
- `lint` 未作为本次通过项记录。此前执行 `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui lint` 时，包内存在若干既有 lint 问题与基线问题，其中包含与本次改动无关的历史错误，当前未在本迭代内顺手清理。

# 发布/部署方式

本次为前端本地链路改造，按常规前端流程处理：

- 在仓库根目录执行 `PATH=/opt/homebrew/bin:$PATH pnpm install`
- 验证 `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui tsc`
- 验证 `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui build`
- 后续若需要实际发布，再按项目既有前端发布流程继续，不在本迭代内直接发布

# 用户/产品视角的验收步骤

1. 启动包含 NCP agent 路由的 nextclaw UI 服务端。
2. 打开 chat 页面，在 URL 上带 `?chatChain=ncp` 进入 NCP 链路。
3. 在空会话下直接发送消息，确认会自动创建新 NCP session，并能正常收到回复。
4. 刷新页面后重新进入同一 session，确认历史消息可被加载。
5. 当 session 处于 running 状态时，重新进入该 session，确认可以基于 NCP 原生流继续恢复。
6. 删除 NCP session，确认只影响 NCP 链路，不影响 legacy 链路。
7. 去掉 `?chatChain=ncp` 或切回 `legacy`，确认旧链路仍可正常使用。
