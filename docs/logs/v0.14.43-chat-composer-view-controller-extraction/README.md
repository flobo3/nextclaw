# 迭代完成说明

- 新增 `ChatComposerViewController`：
  - 文件：[chat-composer-view-controller.ts](../../../packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-view-controller.ts)
  - 职责：承接 DOM / 键盘 / 输入事件到 composer domain controller 的桥接逻辑
- `chat-input-bar-tokenized-composer.tsx` 进一步瘦身：
  - 事件处理器从“包含大量逻辑的 useCallback”收敛为调用 `viewController` 的薄包装
  - DOM 选区恢复、视口高度同步、beforeinput / input / keydown / paste / blur 的编排逻辑不再直接散落在组件体内
- 主组件文件行数进一步下降：
  - `chat-input-bar-tokenized-composer.tsx` 从约 `257` 行降到约 `195` 行
- 结构现在明确分为三层：
  - `ChatComposerController`：编辑器领域状态与命令
  - `ChatComposerViewController`：浏览器 DOM / 事件桥接
  - `ChatInputBarTokenizedComposer`：React 壳层与 JSX 结构

# 测试/验证/验收方式

- 单测：
  - `pnpm -C packages/nextclaw-agent-chat-ui test -- --run src/components/chat/ui/chat-input-bar/chat-composer.utils.test.ts src/components/chat/ui/chat-input-bar/chat-composer-controller.test.ts src/components/chat/ui/chat-input-bar/chat-composer-dom.utils.test.ts src/components/chat/ui/chat-input-bar/chat-composer-keyboard.utils.test.ts src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx`
  - 结果：通过（5 个文件，12 个测试）
- 类型校验：
  - `pnpm -C packages/nextclaw-agent-chat-ui tsc`
  - 结果：通过
- 定向 lint：
  - `pnpm exec eslint packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-view-controller.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar-tokenized-composer.tsx`
  - 结果：通过
- maintainability guard：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-view-controller.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar-tokenized-composer.tsx`
  - 结果：`Errors: 0`、`Warnings: 0`

# 发布/部署方式

- 本次为前端输入框内部结构优化，无需 migration、服务部署或额外发布动作。
- 合入后随正常前端构建链路生效。

# 用户/产品视角的验收步骤

1. 打开 chat 输入框，执行普通输入、slash、skill 选择、继续输入、删除、回车发送等操作。
2. 确认行为与之前一致，不出现 token 丢失、光标错位、输入双写等问题。
3. 查看代码结构，确认主组件不再直接承载主要事件编排逻辑，而是由 `ChatComposerViewController` 接管。
