# 迭代完成说明

- 修复 tokenized chat composer 的输入双写问题：当浏览器直接修改 `contentEditable` DOM 时，组件现在会先提取结构化节点，再清理临时 DOM，再按受控状态回渲染，避免输入字符出现重复。
- 修复 `/` 输入后的光标前跳问题：补齐对根节点原始 text node 选区偏移的解析，保证 slash 输入后光标仍停留在字符后方。
- 将 composer 的 DOM/selection 解析逻辑拆分到独立工具文件，降低主组件复杂度并通过本仓库的 maintainability guard。
- 新增回归测试：
  - 浏览器直接修改 `contentEditable` DOM 时，输入不会双写
  - 根节点原始 text node 的 caret offset 能正确解析

# 测试/验证/验收方式

- 单测：
  - `pnpm -C packages/nextclaw-agent-chat-ui test -- --run src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx src/components/chat/ui/chat-input-bar/chat-composer.utils.test.ts src/components/chat/ui/chat-input-bar/chat-composer-dom.utils.test.ts`
  - 结果：通过（3 个文件，7 个测试）
- 类型校验：
  - `pnpm -C packages/nextclaw-agent-chat-ui tsc`
  - `pnpm -C packages/nextclaw-ui tsc`
  - 结果：通过
- 构建校验：
  - `pnpm -C packages/nextclaw-agent-chat-ui build`
  - 结果：通过
- maintainability guard：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar-tokenized-composer.tsx packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-dom.utils.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-dom.utils.test.ts`
  - 结果：`Errors: 0`、`Warnings: 0`

# 发布/部署方式

- 本次为前端 UI 组件修复，无需数据库 migration、服务部署或额外发布流程。
- 合入后，随正常前端构建链路进入后续发布即可。

# 用户/产品视角的验收步骤

1. 打开 chat 输入框，在空白输入框中输入 `/`。
2. 确认输入框中只出现一个斜杠，且光标停留在斜杠后方。
3. 继续输入普通字符，确认不会出现字符双写。
4. 在输入框中混排普通文本与 skill token，确认继续输入、删除、选中时光标位置保持稳定。
