# v0.0.1-chat-input-loading-skeleton

## 1) 迭代完成说明（改了什么）
- 聊天输入区加载态从“文字提示”改为 skeleton（骨架占位），移除一闪而过的“模型加载中”文案。
- 调整输入框加载态行为：
  - 未加载：不显示加载文字，输入框 placeholder 置空，显示骨架提示块。
  - 已加载且为空：仍显示“暂无可用模型，请先配置提供商”文案与跳转按钮。
- 模型选择器在未加载时改为骨架占位（触发器和下拉空态均为 skeleton），不再显示加载文字。
- 删除不再使用的 i18n 文案键 `chatModelOptionsLoading`。

涉及文件：
- `packages/nextclaw-ui/src/components/chat/ChatInputBar.tsx`
- `packages/nextclaw-ui/src/lib/i18n.ts`

## 2) 测试/验证/验收方式
执行环境说明：当前 shell 未内置 `pnpm`，命令使用 `PATH=/opt/homebrew/bin:$PATH` 前缀。

已执行：
- `PATH=/opt/homebrew/bin:$PATH pnpm build`（通过）
- `PATH=/opt/homebrew/bin:$PATH pnpm lint`（通过；仅仓库既有 warning，无 error）
- `PATH=/opt/homebrew/bin:$PATH pnpm tsc`（通过）

冒烟（UI 最小可访问性）：
- 启动 `@nextclaw/ui preview` 于 `127.0.0.1:4573`，请求 `/chat`
- 观察点：
  - 返回 `HTTP/1.1 200 OK`
  - 返回 HTML 文档头（`<!DOCTYPE html>`）
- 结束后自动清理 preview 进程，无残留。

## 3) 发布/部署方式
本次为前端 UI 交互逻辑改动，无后端/数据库改动。

建议发布流程：
1. 执行 `PATH=/opt/homebrew/bin:$PATH pnpm build && PATH=/opt/homebrew/bin:$PATH pnpm lint && PATH=/opt/homebrew/bin:$PATH pnpm tsc`
2. 按项目前端发布流程执行（可使用 `/release-frontend`）
3. 发布后线上打开聊天页，确认加载瞬间为 skeleton 且不出现加载文案闪烁

不适用项：
- 远程 migration：不适用（无后端/数据库变更）

## 4) 用户/产品视角的验收步骤
1. 打开聊天页，在 provider/model 数据尚未返回时，输入区应显示 skeleton，不出现“模型加载中”文案。
2. 数据加载完成后：
   - 若存在可用模型：恢复正常输入 placeholder。
   - 若无可用模型：显示“暂无可用模型，请先配置提供商”及“去配置提供商”按钮。
3. 模型选择器加载瞬间应为 skeleton 占位，不出现加载文案闪烁。
