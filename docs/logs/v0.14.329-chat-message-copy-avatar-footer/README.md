# v0.14.329-chat-message-copy-avatar-footer

## 迭代完成说明

- 保留聊天消息复制按钮能力，允许对可复制的 assistant 消息进行一键复制。
- 保留 assistant 头像样式更新。
- 保留消息卡片底部的生成中加载态展示。
- 撤销此前一轮不被采纳的聊天消息宽度、间距、包裹层和占位样式微调，恢复更接近原始卡片布局的展示方式。

## 测试/验证/验收方式

- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui test -- chat-message-list.test.tsx`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui tsc`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui lint`

## 发布/部署方式

- 本次为前端聊天 UI 行为与样式收敛，无需远程 migration。
- 如需发布，按前端 package 的常规版本提升、构建和发布流程执行。

## 用户/产品视角的验收步骤

1. 打开聊天界面，确认 assistant 头像使用新样式。
2. 对一条包含正文的 assistant 消息，确认消息底部存在复制按钮且可正常复制。
3. 让 assistant 进入流式输出，确认消息卡片底部出现加载态反馈。
4. 对比消息卡片布局，确认未再出现此前不满意的宽度、间距和包裹层微调效果。
