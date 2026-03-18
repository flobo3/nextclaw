# v0.14.5-chat-renderable-draft-guard

## 迭代完成说明

- 将“空 assistant draft 应显示为 thinking/typing，而不是空白气泡”这条规则收敛到最终渲染层：
  - 在 `@nextclaw/agent-chat-ui` 的 `ChatMessageList` 中新增最终闸门
  - 只有具备可见内容的消息才渲染为消息卡片
  - 对于 `assistant` 的 `streaming/pending` draft，如果当前没有任何可见内容，则不渲染气泡，统一显示现有 `Typing...` 占位
- 可见内容判定覆盖：
  - `parts = []`
  - `markdown/reasoning` 仅包含空白字符
  - `markdown/reasoning` 仅包含零宽字符（如 `\u200B`、`\u200C`、`\u200D`、`\u2060`、`\uFEFF`）
- 保留上游适配层的轻量文本净化，但不再把“是否显示为消息卡片还是 loading”分散在多层判断。

## 测试/验证/验收方式

- `@nextclaw/agent-chat-ui` 单测：
  - `pnpm -C packages/nextclaw-agent-chat-ui test -- src/components/chat/ui/chat-message-list/chat-message-list.test.tsx`
- `@nextclaw/agent-chat-ui` 类型检查：
  - `pnpm -C packages/nextclaw-agent-chat-ui tsc`
- `@nextclaw/ui` 单测：
  - `pnpm -C packages/nextclaw-ui test -- src/components/chat/adapters/chat-message.adapter.test.ts`
- `@nextclaw/ui` 类型检查：
  - `pnpm -C packages/nextclaw-ui tsc`
- 结果：
  - `chat-message-list.test.tsx` 6/6 通过
  - `chat-message.adapter.test.ts` 4/4 通过
  - 两侧 `tsc` 通过
- 可维护性自检：
  - `python3 .codex/skills/post-edit-maintainability-guard/scripts/check_maintainability.py --paths packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-message-list/chat-message-list.tsx packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-message-list/chat-message-list.test.tsx packages/nextclaw-ui/src/components/chat/adapters/chat-message.adapter.ts packages/nextclaw-ui/src/components/chat/adapters/chat-message.adapter.test.ts`
  - 结果：无告警、无阻塞项

## 发布/部署方式

- 本次仅涉及前端渲染逻辑与测试，无 migration、无服务端部署要求。
- 随下一次常规前端/桌面端发布进入产物即可。

## 用户/产品视角的验收步骤

1. 在聊天界面发送消息，触发 assistant 开始流式回复。
2. 在 assistant 尚未产出可见文本、reasoning 或 tool 结果时：
   - 不应出现空白 assistant 气泡
   - 应显示现有的 thinking/typing 占位
3. 当 assistant 首次产出可见内容后，再展示真实 assistant 消息卡片。
4. 对部分会先吐零宽字符或空白字符的模型，确认不再出现“空气泡卡片”。
