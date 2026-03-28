# v0.14.271-chat-stream-identity-raf-scroll

## 迭代完成说明

本次迭代优化了长消息流式输出的前端性能，重点做了两件事：

1. 状态层不再对未变消息做深拷贝，保留了稳定消息对象引用，减少流式增量下的整树失活重建。
2. 消息列表适配层加入按消息对象的结果缓存，未变消息会复用上一次的适配结果。
3. 自动滚动改为按帧合并，避免每个 token 都触发一次立即滚动和布局抖动。

相关代码：

- [agent-conversation-state-manager.ts](/Users/tongwenwen/Projects/Peiiii/nextclaw/packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/agent-conversation-state-manager.ts)
- [chat-message-list.container.tsx](/Users/tongwenwen/Projects/Peiiii/nextclaw/packages/nextclaw-ui/src/components/chat/containers/chat-message-list.container.tsx)
- [use-sticky-bottom-scroll.ts](/Users/tongwenwen/Projects/Peiiii/nextclaw/packages/nextclaw-agent-chat-ui/src/components/chat/hooks/use-sticky-bottom-scroll.ts)

## 测试/验证/验收方式

已执行：

- `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit test -- src/agent/agent-conversation-state-manager.test.ts`
- `pnpm -C packages/nextclaw-ui test -- src/components/chat/containers/chat-message-list.container.test.tsx`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit tsc`
- `pnpm -C packages/nextclaw-ui tsc`
- `pnpm -C packages/nextclaw-agent-chat-ui tsc`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit lint`
- `pnpm -C packages/nextclaw-ui lint`
- `pnpm -C packages/nextclaw-agent-chat-ui lint`

验收关注点：

- 未变消息在连续快照中保持同一引用。
- 流式输出过程中，旧消息不应跟着每个 token 重新适配。
- 自动滚动应保持跟随到底部，但不应在高频流式更新下出现明显卡顿。

## 发布/部署方式

本次改动属于前端/共享 UI 与 NCP 工具链代码，无需单独部署脚本。

发布时按仓库常规流程执行对应包的 build / lint / tsc / release 流程即可，涉及包包括：

- `@nextclaw/ncp-toolkit`
- `@nextclaw/agent-chat-ui`
- `@nextclaw/ui`

## 用户/产品视角的验收步骤

1. 打开聊天页并发送一段会持续流式输出的长回复。
2. 在消息数较多的会话中继续触发流式输出，确认输入不卡、页面不明显掉帧。
3. 观察聊天窗口是否仍会自动滚到最新消息底部。
4. 在长输出过程中手动向上滚动，确认页面不会因为自动滚动频繁抢焦点。
5. 等待流式结束后，确认历史消息仍正常显示，且新增内容没有丢失。
