# 迭代完成说明

本次迭代将聊天默认入口回滚到 legacy 链路，作为 NCP 能力装配补齐前的阶段性稳态方案。

本次改动包括：

- 将前端聊天默认链路从 `ncp` 恢复为 `legacy`。
- 保留显式切换入口：仍可通过 `?chatChain=ncp` 或环境变量 `VITE_CHAT_CHAIN=ncp` 进入新链路继续验证。
- 保持后端 NCP agent/session 路由并行挂载，不删除已完成的 NCP groundwork。
- 补充链路解析测试，锁住“默认 legacy + 显式 ncp 切换”的行为契约。

# 测试/验证/验收方式

已执行：

- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui test -- src/components/chat/chat-chain.test.ts`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui build`

结果：

- 链路解析定向测试通过。
- `@nextclaw/ui` 构建通过。

# 发布/部署方式

本次为前端默认链路回滚，不涉及数据库或 migration。

如需集成验证：

- 重启 `nextclaw-ui` dev server
- 直接打开聊天页，默认应回到 legacy 链路
- 如需继续验证 NCP，对聊天页追加 `?chatChain=ncp`

# 用户/产品视角的验收步骤

1. 不带任何 `chatChain` 参数直接进入聊天页。
2. 确认默认进入旧链路并可正常发送消息。
3. 对同一页面追加 `?chatChain=ncp` 后刷新，确认仍可进入新链路做验证。
4. 再移除该参数刷新，确认默认继续保持 legacy。
