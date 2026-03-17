# 迭代完成说明

本次迭代修复了聊天消息列表的两个展示细节，并且改动落在共享展示层 `@nextclaw/agent-chat-ui`，因此 legacy 与 NCP 两条链路都会一起受益。

本次改动包括：

- 为消息头像容器补充 `shrink-0` 约束，避免在窄布局或长消息场景下头像被 flex 压缩，导致 AI 左侧头像视觉缺失。
- 将非用户消息的默认头像语义收敛为 AI 头像，仅工具消息继续使用工具头像，避免通用消息角色落到错误的视觉表现。
- 将用户消息底部信息戳的样式与 AI 消息底部信息戳统一到同一套字号、行高和颜色体系，仅保留左右对齐差异。
- 为共享消息列表补充头像存在性的测试断言，锁住后续回归。

# 测试/验证/验收方式

已执行：

- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui test -- src/components/chat/ui/chat-message-list/chat-message-list.test.tsx`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui build`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui lint`

结果：

- 定向测试通过。
- 类型检查通过。
- 构建通过。
- lint 通过。

# 发布/部署方式

本次为共享前端展示层样式修复，不涉及后端、数据库或 migration。

如需继续集成验证：

- 保持当前工作区代码
- 启动 nextclaw UI
- 分别在 legacy 与 `?chatChain=ncp` 两条链路下检查消息列表表现

# 用户/产品视角的验收步骤

1. 打开聊天页面，发送一条消息并等待 AI 回复。
2. 确认 AI 消息卡片左侧头像可见且稳定，不会因为消息宽度被挤掉。
3. 确认用户消息卡片右侧头像仍正常显示。
4. 对比用户消息和 AI 消息下方的信息戳，确认字号、颜色、密度风格一致，仅对齐方向不同。
5. 切换到 `?chatChain=ncp` 再重复一次，确认共享 UI 在新旧链路下表现一致。
