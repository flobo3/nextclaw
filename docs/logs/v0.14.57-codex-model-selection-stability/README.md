# v0.14.57-codex-model-selection-stability

## 迭代完成说明

- 修复 Codex 会话在用户手动选择模型后，发送首条消息时被旧会话模型自动覆盖的问题。
- 根因是模型同步存在两层逻辑：一层是 `useSyncSelectedModel`，另一层是页面级的重复 hydrate。重复 hydrate 会在新会话 metadata 尚未稳定时，错误回退到最近同类型会话的旧模型。
- 本次将模型同步收敛到单一入口，并补上“draft 会话 materialize 为真实 sessionKey 时保留当前有效模型”的规则，避免用户显式选择被覆盖。
- 同步补充回归测试，覆盖“新会话首发消息时保留当前模型”和“当前模型失效时再回退”的场景。

## 测试/验证/验收方式

- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --dir packages/nextclaw-ui tsc --noEmit`
- 回归测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --dir packages/nextclaw-ui exec vitest run src/components/chat/chat-page-runtime.test.ts`
- 受影响文件 lint：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --dir packages/nextclaw-ui exec eslint src/components/chat/chat-page-runtime.ts src/components/chat/chat-page-data.ts src/components/chat/ncp/ncp-chat-page-data.ts src/components/chat/ncp/NcpChatPage.tsx src/components/chat/legacy/LegacyChatPage.tsx src/components/chat/chat-page-runtime.test.ts`
- 可维护性自检：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-ui/src/components/chat/chat-page-runtime.ts packages/nextclaw-ui/src/components/chat/chat-page-data.ts packages/nextclaw-ui/src/components/chat/ncp/ncp-chat-page-data.ts packages/nextclaw-ui/src/components/chat/ncp/NcpChatPage.tsx packages/nextclaw-ui/src/components/chat/legacy/LegacyChatPage.tsx packages/nextclaw-ui/src/components/chat/chat-page-runtime.test.ts`
- 说明：
  - 全量 `pnpm --dir packages/nextclaw-ui lint` 仍会被仓库内既有无关错误阻塞（如 `src/components/ui/input.tsx`、`src/components/ui/label.tsx`），不属于本次改动引入。

## 发布/部署方式

- 前端受影响包按 UI-only 路径发布：
  - `@nextclaw/ui`
  - `nextclaw`
- 版本化路径：
  - `PATH=/opt/homebrew/bin:$PATH pnpm release:version`
- 发布路径：
  - 因仓库全量 `release:publish` 会被既有无关 lint 问题阻塞，本次采用“已完成定向验证 + changeset publish/tag”的闭环方式发布目标包。
- 发布结果：
  - `@nextclaw/ui@0.9.2`
  - `nextclaw@0.12.6`
  - 远端验证：
    - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/ui version` -> `0.9.2`
    - `PATH=/opt/homebrew/bin:$PATH npm view nextclaw version` -> `0.12.6`

## 用户/产品视角的验收步骤

1. 启动本地开发环境，进入聊天页面并新建 `Codex` 会话。
2. 在输入区将模型切到 `gpt-5.4`。
3. 发送首条消息。
4. 确认发送后模型选择器仍保持 `gpt-5.4`，不会自动跳回 `gpt-5.3-codex`。
5. 刷新页面重新进入该会话，确认会话仍恢复到之前保存的模型选择。
