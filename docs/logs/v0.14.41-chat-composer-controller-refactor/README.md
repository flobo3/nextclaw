# 迭代完成说明

- 为 tokenized chat composer 新增 `ChatComposerController` class，统一管理以下编辑器状态与命令：
  - `nodes`
  - `selection`
  - `insertText`
  - `insertSkillToken`
  - `deleteContent`
  - `syncSelectedSkills`
  - slash trigger 派生
- `ChatInputBarTokenizedComposer` 改为薄视图层：
  - DOM 事件只负责采集浏览器输入与选区
  - 实际编辑行为由 controller 执行
  - React 仅保留必要的 DOM 选区恢复与高度同步
- 修复 `replaceChatComposerRange` 的边界语义错误：
  - 之前在“光标正好位于 token 后面继续输入”时，会误把 token 当成被覆盖内容
  - 现在 token 边界插入文本不会再吞掉已选 skill
- 将 `nextclaw-ui` 侧 `selectedSkills` 的写入收回到 composer 单一事实来源：
  - `ChatInputManager`
  - `NcpChatInputManager`
  - 外部修改 skill 选择时，不再只改一份 `selectedSkills`，而是同步回 composer nodes，再由 nodes 派生 `selectedSkills`
- 新增/补强测试：
  - `ChatComposerController` 行为测试
  - token 边界插入文本回归测试
  - 既有 DOM 输入与 slash/caret 测试继续保留

# 测试/验证/验收方式

- 单测：
  - `pnpm -C packages/nextclaw-agent-chat-ui test -- --run src/components/chat/ui/chat-input-bar/chat-composer.utils.test.ts src/components/chat/ui/chat-input-bar/chat-composer-controller.test.ts src/components/chat/ui/chat-input-bar/chat-composer-dom.utils.test.ts src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx`
  - 结果：通过（4 个文件，10 个测试）
- 类型校验：
  - `pnpm -C packages/nextclaw-agent-chat-ui tsc`
  - `pnpm -C packages/nextclaw-ui tsc`
  - 结果：通过
- 构建校验：
  - `pnpm -C packages/nextclaw-agent-chat-ui build`
  - 结果：通过
- maintainability guard：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer.utils.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer.utils.test.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-controller.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-controller.test.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar-tokenized-composer.tsx packages/nextclaw-ui/src/components/chat/chat-composer-state.ts packages/nextclaw-ui/src/components/chat/managers/chat-input.manager.ts packages/nextclaw-ui/src/components/chat/ncp/ncp-chat-input.manager.ts`
  - 结果：`Errors: 0`、`Warnings: 0`

# 发布/部署方式

- 本次为前端输入框架构优化与行为修复，无需数据库 migration、服务部署或额外发布步骤。
- 合入后，随正常前端构建与后续发布流程一起生效。

# 用户/产品视角的验收步骤

1. 在 chat 输入框中选择一个 skill。
2. 将光标放在该 skill token 后继续输入普通文本。
3. 确认 skill token 不会被清空，文本会正常追加在 token 后。
4. 再测试 `/`、回车、退格、删除与继续混排 skill + 文本，确认 token、光标与 slash 行为都稳定。
