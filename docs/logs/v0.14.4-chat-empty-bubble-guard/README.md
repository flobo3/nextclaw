# v0.14.4-chat-empty-bubble-guard

## 迭代完成说明

- 修复聊天区偶发先出现空 assistant 气泡的问题。
- 在消息适配层增加渲染前过滤：
  - 当消息在 trim 后没有任何可展示 part 时，不再渲染消息卡片。
- 调整 `hasAssistantDraft` 判定，改为基于过滤后的消息列表：
  - 首个有效 token 到来前显示 typing 态
  - 避免“空白气泡已占位，但 typing 又被隐藏”的体验问题
- 新增定向测试，覆盖“空白 assistant 消息会被过滤，正常消息保留”的场景。

## 测试/验证/验收方式

- 单测：
  - `pnpm -C packages/nextclaw-ui test -- src/components/chat/adapters/chat-message.adapter.test.ts`
- 类型检查：
  - `pnpm -C packages/nextclaw-ui tsc`
- 冒烟测试：
  - `pnpm -C packages/nextclaw-ui exec tsx --eval '...adaptChatMessages(...)...'`
  - 观察点：空白 assistant 消息不出现在结果中，正常 assistant 消息仍保留
- 可维护性自检：
  - `python3 .codex/skills/post-edit-maintainability-guard/scripts/check_maintainability.py --paths packages/nextclaw-ui/src/components/chat/adapters/chat-message.adapter.ts packages/nextclaw-ui/src/components/chat/containers/chat-message-list.container.tsx packages/nextclaw-ui/src/components/chat/adapters/chat-message.adapter.test.ts`
- 结果：
  - 单测 4/4 通过
  - `tsc` 通过
  - 冒烟输出仅保留 `assistant-ok`
  - 可维护性检查无告警

## 发布/部署方式

- 本次仅涉及前端渲染逻辑与对应测试，无 migration、无后端部署要求。
- 随下次常规前端/桌面端发布进入产物即可。

## 用户/产品视角的验收步骤

1. 打开聊天界面并发送一条消息。
2. 观察 assistant 回复刚开始生成的阶段：
   - 应先看到 typing 或等待态
   - 不应先出现一个空白 assistant 气泡
3. 当首段文本、reasoning 或 tool 卡片到来后，再显示 assistant 消息卡片。
4. 确认正常回复内容、reasoning、tool 结果展示不受影响。
