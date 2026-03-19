# 迭代完成说明

- 按“能力都放到 class、逻辑都放进去”的要求，移除 hook 作为主逻辑承载层：
  - 删除 `use-chat-composer-view-bindings.ts`
  - 新增 [chat-composer-runtime.ts](../../../packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-runtime.ts)
- 当前输入框分层变为：
  - `ChatComposerController`：编辑器领域命令与状态
  - `ChatComposerViewController`：DOM / 键盘 / 输入事件桥接
  - `ChatComposerRuntime`：运行时整合层，负责将 React 壳层与 class 体系连接起来
  - `ChatInputBarTokenizedComposer`：非常薄的挂载壳层
- `chat-input-bar-tokenized-composer.tsx` 不再直接持有主要逻辑：
  - 不再通过 hook 承担逻辑编排
  - 组件主要只负责 props 解构、runtime 更新、effect 挂载与 JSX
- 按要求保持 class 方法全部为箭头函数：
  - [chat-composer-controller.ts](../../../packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-controller.ts)
  - [chat-composer-view-controller.ts](../../../packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-view-controller.ts)
  - [chat-composer-runtime.ts](../../../packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-runtime.ts)

# 测试/验证/验收方式

- 单测：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui test -- --run src/components/chat/ui/chat-input-bar/chat-composer.utils.test.ts src/components/chat/ui/chat-input-bar/chat-composer-controller.test.ts src/components/chat/ui/chat-input-bar/chat-composer-dom.utils.test.ts src/components/chat/ui/chat-input-bar/chat-composer-keyboard.utils.test.ts src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx`
  - 结果：通过（5 个文件，12 个测试）
- 类型校验：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui tsc`
  - 结果：通过
- 定向 lint：
  - `PATH=/opt/homebrew/bin:$PATH pnpm exec eslint packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-controller.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-view-controller.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-runtime.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar-tokenized-composer.tsx`
  - 结果：通过
- maintainability guard：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-controller.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-view-controller.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-runtime.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar-tokenized-composer.tsx`
  - 结果：`Errors: 0`、`Warnings: 0`

# 发布/部署方式

- 本次为前端输入框内部结构重构，无需 migration、服务部署或额外发布动作。
- 合入后，随正常前端构建链路生效。

# 用户/产品视角的验收步骤

1. 打开 chat 输入框，测试普通输入、slash、选择 skill、继续输入、删除、回车发送。
2. 确认行为正常，不出现 token 丢失、输入双写、光标错位。
3. 查看代码结构，确认主路径不再通过 React hook 承载主要逻辑，而是由 class runtime / view-controller / controller 层完成。
