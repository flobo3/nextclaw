# 迭代完成说明

- 继续压薄 `chat-input-bar-tokenized-composer.tsx`，把组件中的厚逻辑进一步拆出：
  - 新增 `chat-composer-keyboard.utils.ts`
    - 负责键盘事件到编辑器动作的纯决策
    - 将 slash 菜单导航、发送、停止、换行、删除等分支逻辑从组件中移出
  - 新增 `chat-composer-inline-node.tsx`
    - 负责单个 inline text/token 节点的渲染
    - 组件不再内联维护 token/text 的大段渲染逻辑
  - `chat-composer-dom.utils.ts`
    - 新增 `readComposerDocumentStateFromDom`
    - 将“从 DOM 同时读取 nodes + selection”的编排逻辑移出组件
- `chat-input-bar-tokenized-composer.tsx` 现在更接近“薄 View”：
  - 绑定 DOM 事件
  - 调用 controller / util
  - 提交 snapshot
  - 渲染 inline nodes
- 组件文件行数从约 `299` 行进一步下降到约 `257` 行，主要复杂分支已从主组件拆离。

# 测试/验证/验收方式

- 单测：
  - `pnpm -C packages/nextclaw-agent-chat-ui test -- --run src/components/chat/ui/chat-input-bar/chat-composer.utils.test.ts src/components/chat/ui/chat-input-bar/chat-composer-controller.test.ts src/components/chat/ui/chat-input-bar/chat-composer-dom.utils.test.ts src/components/chat/ui/chat-input-bar/chat-composer-keyboard.utils.test.ts src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx`
  - 结果：通过（5 个文件，12 个测试）
- 类型校验：
  - `pnpm -C packages/nextclaw-agent-chat-ui tsc`
  - 结果：通过
- 定向 lint：
  - `pnpm exec eslint packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-dom.utils.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-keyboard.utils.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-keyboard.utils.test.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-inline-node.tsx packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar-tokenized-composer.tsx`
  - 结果：通过
- maintainability guard：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-dom.utils.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-keyboard.utils.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-keyboard.utils.test.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-inline-node.tsx packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar-tokenized-composer.tsx`
  - 结果：`Errors: 0`、`Warnings: 0`

# 发布/部署方式

- 本次为前端组件结构优化，无需 migration、服务部署或额外发布步骤。
- 合入后随正常前端构建链路生效。

# 用户/产品视角的验收步骤

1. 打开 chat 输入框，输入普通文本、`/`、skill token 选择与删除。
2. 确认行为与之前一致，包括：
   - slash 菜单可用
   - 选择 skill 后继续输入不会丢 token
   - 回车发送、Shift+Enter 换行、Backspace/Delete 删除正常
3. 从代码结构上检查：
   - 主组件不再包含大段键盘分支
   - inline 节点渲染已拆到独立文件
   - DOM 读取编排已拆到 util
