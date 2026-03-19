# 迭代完成说明

- 将 `chat-input-bar-tokenized-composer` 收敛为 React 壳层，不再由 React 直接渲染 `contentEditable` 内部 children。
- 新增 `ChatComposerSurfaceRenderer`，由 class/runtime 统一渲染 inline text node 与 token node，收回编辑 surface 的 DOM ownership。
- 删除会直接触碰 React 子树的 DOM 清理路径，避免 `removeChild` 冲突。
- 保留 `beforeinput` 主链路与 `input` 兜底同步，但兜底后的 DOM 重绘改为 runtime 自己接管，修复 slash 输入、skill token 丢失与 surface 崩溃的根因链路。

# 测试/验证/验收方式

- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui test -- --run src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx src/components/chat/ui/chat-input-bar/chat-composer-dom.utils.test.ts src/components/chat/ui/chat-input-bar/chat-composer-controller.test.ts src/components/chat/ui/chat-input-bar/chat-composer-keyboard.utils.test.ts src/components/chat/ui/chat-input-bar/chat-composer.utils.test.ts`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm exec eslint packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar-tokenized-composer.tsx packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-runtime.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-view-controller.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-surface-renderer.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-dom.utils.ts`
- `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar-tokenized-composer.tsx packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-runtime.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-view-controller.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-surface-renderer.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-dom.utils.ts`

# 发布/部署方式

- 本次未执行发布。
- 若后续需要发布前端 UI 变更，按项目既有前端发布流程执行，并在发布前补一轮真实页面冒烟。

# 用户/产品视角的验收步骤

1. 在 NCP chat 输入框中输入 `/`，确认只出现一个斜杠，并正常弹出 slash command 菜单。
2. 选择一个 skill token 后继续输入普通文本，确认 token 不会被清空，文本能继续追加在 token 前后。
3. 反复执行“输入 slash -> 选 skill -> 继续输入 -> Backspace 删除”，确认页面不再报 `removeChild`/`NotFoundError`，也不会出现类似 reload 的崩溃。
4. 鼠标拖选跨过文本与 skill token，确认选区与高亮表现连续，输入框行为接近内联富文本。
