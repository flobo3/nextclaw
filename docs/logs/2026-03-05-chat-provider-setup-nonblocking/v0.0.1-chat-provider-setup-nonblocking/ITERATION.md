# v0.0.1-chat-provider-setup-nonblocking

## 1) 迭代完成说明（改了什么）
- 聊天页移除首屏中间阻塞式“开始前先配置提供商”卡片，改为顶部非阻塞提示条。
- 新增“配置状态就绪”门槛：仅在 `config` 与 `config-meta` 完成首次获取后，才判定“暂无可用模型/需配置提供商”，避免已配置用户首屏短暂误判闪烁。
- 欢迎页在无会话时保持正常展示，不再被配置引导卡片覆盖。

涉及文件：
- `packages/nextclaw-ui/src/components/chat/ChatPage.tsx`
- `packages/nextclaw-ui/src/components/chat/ChatConversationPanel.tsx`

## 2) 测试/验证/验收方式
执行环境说明：当前 shell 未内置 `pnpm`，使用 `PATH=/opt/homebrew/bin:$PATH` 前缀执行。

已执行：
- `PATH=/opt/homebrew/bin:$PATH pnpm build`（通过）
- `PATH=/opt/homebrew/bin:$PATH pnpm lint`（通过；存在仓库既有 warning，无 error）
- `PATH=/opt/homebrew/bin:$PATH pnpm tsc`（通过）

最小冒烟（UI 可访问性）：
- 命令：启动 `@nextclaw/ui` 预览服务后请求 `http://127.0.0.1:4273/chat`
- 观察点：
  - 返回 `HTTP/1.1 200 OK`
  - 返回 HTML 文档头（`<!DOCTYPE html>`）

## 3) 发布/部署方式
本次仅前端 UI 交互逻辑变更，无后端/数据库变更。

建议发布流程：
1. 运行 `PATH=/opt/homebrew/bin:$PATH pnpm build && PATH=/opt/homebrew/bin:$PATH pnpm lint && PATH=/opt/homebrew/bin:$PATH pnpm tsc`
2. 按项目既有前端发布流程执行（如使用 `/release-frontend` 命令或等效流程）
3. 发布后打开聊天页做一次线上冒烟，确认不再出现首屏阻塞引导闪烁

不适用项：
- 远程 migration：不适用（无后端/数据库改动）

## 4) 用户/产品视角的验收步骤
1. 在已配置至少一个 Provider 的环境打开聊天页（`/chat`）。
2. 首屏应直接看到欢迎内容，不出现中间大卡片阻塞提示。
3. 页面顶部不应短暂闪现“请先配置提供商”的误导提示。
4. 输入框区域保持原有“暂无可用模型”提示逻辑（仅在确实无可用模型时出现）。
5. 在未配置 Provider 的环境打开聊天页：应看到顶部非阻塞提示条，并可点击“去配置提供商”。
