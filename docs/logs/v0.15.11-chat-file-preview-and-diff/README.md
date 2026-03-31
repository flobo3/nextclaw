# v0.15.11-chat-file-preview-and-diff

## 迭代完成说明（改了什么）
- 为聊天工具卡片新增结构化文件变更视图模型：不再只把 `file_change / edit_file / write_file / apply_patch / read_file` 当作普通字符串输出，而是先抽取文件路径、行级增删和预览内容，再交给 UI 渲染。
- 聊天文件工具卡片升级为“运行中可预览、完成后可读 diff”的体验：
  - `edit_file` / `write_file` / `apply_patch` / Codex `file_change` 在工具运行阶段即可展示目标文件与预期改动。
  - 工具完成后继续保留结构化 diff 视图，支持展开查看具体增删行。
  - `file_change` 被纳入文件操作卡片分类，`command_execution` 被纳入终端卡片分类，避免 Codex 运行时落到过于笼统的 generic 卡片。
- 新增专门的文件 diff / patch 解析层，并把“工具数据提取”和“diff 渲染原语”拆成两个文件，避免把新能力继续堆成一个超大 helper。
- 补充前端回归测试，覆盖：
  - 运行中 `edit_file` 自动展开预览
  - 完成后的 `file_change` diff 展开渲染
  - 适配层把文件类工具调用转换成结构化卡片数据

## 测试/验证/验收方式
- 已执行：`PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui exec vitest run src/components/chat/adapters/chat-message.adapter.test.ts`
- 已执行：`PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui exec vitest run src/components/chat/ui/chat-message-list/chat-message-list.test.tsx src/components/chat/ui/chat-message-list/__tests__/chat-message-list.file-operation.test.tsx`
- 已执行：`PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
- 已执行：`PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui tsc`
- 已执行：`PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui exec eslint src/components/chat/adapters/chat-message.file-operation-card.ts src/components/chat/adapters/chat-message.file-operation-diff.ts src/components/chat/adapters/chat-message-part.adapter.ts src/components/chat/adapters/chat-message.adapter.test.ts`
- 已执行：`PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui exec eslint src/components/chat/view-models/chat-ui.types.ts src/components/chat/index.ts src/components/chat/ui/chat-message-list/chat-tool-card.tsx src/components/chat/ui/chat-message-list/tool-card/tool-card-views.tsx src/components/chat/ui/chat-message-list/tool-card/tool-card-file-operation.tsx src/components/chat/ui/chat-message-list/chat-message-list.test.tsx src/components/chat/ui/chat-message-list/__tests__/chat-message-list.file-operation.test.tsx`
- 已执行：`PATH=/opt/homebrew/bin:$PATH node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths ...`
  - 结果：本次改动文件无 error，保留 3 条 warning：
    - `packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-message-list` 目录历史上仍在预算线以上
    - `packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-message-list/chat-message-list.test.tsx` 接近测试文件预算
    - `packages/nextclaw-ui/src/components/chat/adapters/chat-message.adapter.test.ts` 本次增长较明显，后续可再拆 fixture / builder
- 已执行：`PATH=/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard`
  - 结果：命令失败，但失败原因来自仓库内已有脏改动触发的增量治理，不属于本次改动：
    - `packages/nextclaw-remote/src/remote-connector.ts`
    - `packages/nextclaw/src/cli/commands/remote-connector-runtime.test.ts`

## 发布/部署方式
- 本次仅涉及聊天前端工具卡片与适配层体验升级，未执行发布。
- 如需发布，按既有前端/包发布流程执行受影响包构建、版本发布与前端上线闭环。

## 用户/产品视角的验收步骤
1. 在聊天页触发一次会修改文件的工具调用，例如 `edit_file` 或 Codex `file_change`。
2. 在工具仍处于运行中的阶段，确认工具卡片会自动展开，并且能提前看到目标文件路径与预期改动，而不是一直只有转圈。
3. 等工具完成后，确认卡片仍保留结构化 diff 视图，可清晰区分新增行和删除行。
4. 再触发一次 `apply_patch` 或 `write_file`，确认多种文件修改工具都走同一套结构化文件卡片体验，而不是退回普通文本日志。
5. 触发一次 `command_execution`，确认 Codex 命令执行不再误落到 generic 卡片，而是进入终端卡片视图。
