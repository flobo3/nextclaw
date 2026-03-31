# v0.14.340-chat-tool-completed-default-collapse

## 迭代完成说明

- 调整 `@nextclaw/agent-chat-ui` 中终端类工具卡片的默认展开策略。
- 重新进入聊天/绘画等会话时，已完成的终端类工具卡片不再因为“短输出”而自动展开，默认改为收起。
- 保留运行中工具的自动展开行为；失败态仍保持默认展开，避免错误信息被完全折叠。
- 补充消息列表回归测试，锁定“已完成终端工具初始挂载时默认收起”的行为。
- 在 `@nextclaw/ui` 的聊天会话面板中，为消息列表增加按 `selectedSessionKey` 的重挂载 key，避免跨会话/重新进入时复用旧的本地展开状态。
- 补充“消息列表重挂载后，已完成终端工具重新恢复默认收起”的回归测试，覆盖你描述的“再次进入时默认收起”场景。

## 测试/验证/验收方式

- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui exec vitest run src/components/chat/ui/chat-message-list/chat-message-list.test.tsx`
  - 结果：通过，`14` 条测试全部通过。
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui tsc`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/ui tsc`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/ui lint`
  - 结果：通过；存在 `@nextclaw/ui` 包既有 warning，但无本次改动新增 error。
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui lint`
  - 结果：通过；存在该包既有 warning，但无本次改动新增 error。
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui build`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-message-list/tool-card/tool-card-views.tsx packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-message-list/chat-message-list.test.tsx packages/nextclaw-ui/src/components/chat/ChatConversationPanel.tsx`
  - 结果：通过；仅保留目标目录已存在的目录预算 warning。
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm lint:maintainability:guard`
  - 结果：失败，但失败项来自工作区中其它已修改文件 `packages/extensions/nextclaw-channel-plugin-feishu/src/bot.ts` 与 `packages/extensions/nextclaw-channel-plugin-feishu/src/bot.test.ts`，不是本次聊天工具卡片改动引入。

## 发布/部署方式

- 本次仅涉及前端共享聊天 UI 包，无后端、数据库或 migration 变更。
- 如需随版本发布，按项目既有前端发布流程发布 `@nextclaw/agent-chat-ui` 及其消费方，并做一次集成界面确认。

## 用户/产品视角的验收步骤

1. 打开聊天界面，进入一个包含历史工具调用记录的会话，例如之前触发过绘画或命令执行的对话。
2. 确认已完成的终端类工具卡片默认处于收起状态，不会在刚进入页面时自动展开输出。
3. 先手动展开某个已完成工具卡片，再切到别的会话或离开后重新进入该会话。
4. 确认重新进入后，该已完成工具卡片恢复为默认收起，而不是沿用上一次浏览时的展开状态。
5. 触发一个新的工具调用，确认运行中卡片仍会自动展开，便于观察过程。
6. 等待该工具完成，确认卡片会自动收起；若用户当前手动展开，仍可正常查看结果。
