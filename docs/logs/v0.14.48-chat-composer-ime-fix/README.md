# 迭代完成说明

- 修复 tokenized composer 在中文输入法场景下会提前提交拼音中间态的问题。
- 为 composer runtime 增加 composition 生命周期管理：组合输入期间暂停 surface 重绘、选区同步与 fallback `input` 回读。
- 在组合输入结束时，再统一从 DOM 同步最终文本，避免把 `n`、`ni` 这类预编辑内容错误落盘。
- 补充 IME 回归测试，覆盖“组合输入未结束前不提交，结束后再提交最终中文字符”。

# 测试/验证/验收方式

- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui test -- --run src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx src/components/chat/ui/chat-input-bar/chat-composer-dom.utils.test.ts src/components/chat/ui/chat-input-bar/chat-composer-controller.test.ts src/components/chat/ui/chat-input-bar/chat-composer-keyboard.utils.test.ts src/components/chat/ui/chat-input-bar/chat-composer.utils.test.ts`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm exec eslint packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar-tokenized-composer.tsx packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-runtime.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-view-controller.ts`
- `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar-tokenized-composer.tsx packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-runtime.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-view-controller.ts`

# 发布/部署方式

- 本次未执行发布。
- 如需发版，沿用前端既有发布流程，并在真实浏览器中补中文输入法冒烟。

# 用户/产品视角的验收步骤

1. 在 chat 输入框中切到中文输入法，输入 `nihao`，确认中间态不会被提前落盘，仍可正常联想出“你好”。
2. 在已有 skill token 的情况下继续使用中文输入法，确认 token 不会被清空，最终中文文本可正常插入。
3. 在中文输入法场景下输入 `/`、选择 skill、继续输入中文，确认 slash 菜单、选区和删除行为仍正常。
