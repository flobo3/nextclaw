# 迭代完成说明

- 基于 NCP 图片链路修复结果，完成本轮 release version 收口。
- 为本次改动生成并消费 changeset，联动提升以下公开包版本：
  - `@nextclaw/agent-chat-ui` `0.2.3 -> 0.2.4`
  - `@nextclaw/ncp-react` `0.3.4 -> 0.3.5`
  - `@nextclaw/ui` `0.10.2 -> 0.10.3`
  - `@nextclaw/mcp` `0.1.44 -> 0.1.45`
  - `@nextclaw/server` `0.10.48 -> 0.10.49`
  - `nextclaw` `0.15.6 -> 0.15.7`
- 同步生成对应 changelog 更新，准备进入正式 publish 闭环。

# 测试/验证/验收方式

- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/ncp-packages/nextclaw-ncp-react build`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw build`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui lint`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw lint`
- `NODE_PATH=/Users/peiwang/Projects/nextbot/node_modules/.pnpm/loupe@3.2.1/node_modules PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw test -- --run src/cli/commands/ncp/nextclaw-ncp-context-builder.test.ts src/cli/commands/ncp/nextclaw-agent-session-store.test.ts`
- `NODE_PATH=/Users/peiwang/Projects/nextbot/node_modules/.pnpm/loupe@3.2.1/node_modules PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui test -- --run src/components/chat/chat-composer-state.test.ts src/components/chat/ncp/ncp-session-adapter.test.ts`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/ncp-demo exec node scripts/smoke-ui.mjs`
- `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-ui/src/components/chat/chat-composer-state.ts packages/nextclaw-ui/src/components/chat/chat-composer-state.test.ts packages/nextclaw-ui/src/components/chat/ncp/ncp-chat-input.manager.ts packages/nextclaw-ui/src/components/chat/ncp/NcpChatPage.tsx packages/nextclaw-ui/src/components/chat/ncp/ncp-session-adapter.test.ts packages/ncp-packages/nextclaw-ncp-react/src/attachments/ncp-attachments.ts packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-current-turn.ts packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-context-builder.ts packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-context-builder.test.ts packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-message-bridge.ts packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-session-preferences.ts`

# 发布/部署方式

- 执行 `PATH=/opt/homebrew/bin:$PATH pnpm release:version`
- 提交 release commit
- 执行 `PATH=/opt/homebrew/bin:$PATH pnpm release:publish`
- 推送 release commit 与 tags

# 用户/产品视角的验收步骤

1. 安装或升级到本次发布后的 `nextclaw`。
2. 在 NCP 聊天输入框内输入文本、插入图片、继续输入文本。
3. 发送后确认同一条用户消息卡片中的文本与图片顺序和输入框一致。
4. 再发送纯文本追问上一条里的图片，确认模型仍可继续感知该图片，且未发生隐藏模型切换。
