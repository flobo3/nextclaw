# v0.14.21-chat-workflow-revert

## 迭代完成说明

- 撤掉今天新增的 chat tool workflow 展示层实现，恢复为不做 workflow 分组的消息展示。
- 删除 workflow 相关的展示组件与适配分组逻辑，工具调用重新按原始 `tool-card` 逐条展示。
- 保留此前已落地的“空白/零宽 assistant draft 不渲染空气泡”修复，不随本次 workflow 撤回一起回退。

## 测试/验证/验收方式

- `pnpm -C packages/nextclaw-agent-chat-ui test`
- `pnpm -C packages/nextclaw-ui test`
- `pnpm -C packages/nextclaw-agent-chat-ui tsc`
- `pnpm -C packages/nextclaw-ui tsc`
- `pnpm -C packages/nextclaw-agent-chat-ui build`
- `pnpm -C packages/nextclaw-ui build`
- `python3 .codex/skills/post-edit-maintainability-guard/scripts/check_maintainability.py --paths packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-message-list/chat-message-list.tsx packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-message-list/chat-message-list.test.tsx packages/nextclaw-ui/src/components/chat/adapters/chat-message.adapter.ts packages/nextclaw-ui/src/components/chat/adapters/chat-message.adapter.test.ts`

## 发布/部署方式

- 本次为前端展示层回退；如需上线，按项目既有前端发布流程执行，UI-only 场景可使用 `/release-frontend`。
- 发布前确认聊天区连续工具调用已不再以 workflow 容器分组展示。

## 用户/产品视角的验收步骤

1. 打开聊天页面，触发连续多次工具调用。
2. 确认聊天区不再出现 workflow 容器、workflow 轨道或 workflow 节点样式。
3. 确认每次工具调用仍以原有 tool card 形式正常展示。
4. 确认 assistant 仅在空白或零宽草稿阶段显示 typing 占位，不会出现空消息气泡。
