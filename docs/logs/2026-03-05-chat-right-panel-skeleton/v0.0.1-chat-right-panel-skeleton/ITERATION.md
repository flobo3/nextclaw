# v0.0.1-chat-right-panel-skeleton

## 1) 迭代完成说明（改了什么）
- 聊天页右侧主区域新增统一 skeleton 方案：当 provider/config 状态未就绪时，不再渲染真实对话内容与输入区，直接显示整块骨架屏。
- 骨架屏覆盖了消息区与输入区，避免首屏加载阶段因局部状态切换导致的高度变化与闪烁。
- 保留已就绪后的原始渲染逻辑；仅在未就绪短窗口内启用 skeleton。

涉及文件：
- `packages/nextclaw-ui/src/components/chat/ChatConversationPanel.tsx`

## 2) 测试/验证/验收方式
执行环境说明：当前 shell 未内置 `pnpm`，命令使用 `PATH=/opt/homebrew/bin:$PATH` 前缀。

已执行：
- `PATH=/opt/homebrew/bin:$PATH pnpm build`（通过）
- `PATH=/opt/homebrew/bin:$PATH pnpm lint`（通过；仅仓库既有 warning，无 error）
- `PATH=/opt/homebrew/bin:$PATH pnpm tsc`（通过）

冒烟（UI 最小可访问性）：
- 启动 `@nextclaw/ui preview` 于 `127.0.0.1:4673`，请求 `/chat`
- 观察点：
  - 返回 `HTTP/1.1 200 OK`
  - 返回 HTML 文档头（`<!DOCTYPE html>`）
- 结束后自动清理 preview 进程，无残留。

## 3) 发布/部署方式
本次为前端 UI 交互改动，无后端/数据库变更。

建议发布流程：
1. 执行 `PATH=/opt/homebrew/bin:$PATH pnpm build && PATH=/opt/homebrew/bin:$PATH pnpm lint && PATH=/opt/homebrew/bin:$PATH pnpm tsc`
2. 按项目前端发布流程执行（可使用 `/release-frontend`）
3. 发布后线上打开聊天页，确认首屏加载阶段为整块 skeleton，且右侧高度稳定

不适用项：
- 远程 migration：不适用（无后端/数据库变更）

## 4) 用户/产品视角的验收步骤
1. 刷新进入聊天页首屏，右侧应先出现整块 skeleton（消息区 + 输入区）。
2. 在 skeleton 到真实页面切换过程中，右侧不应出现明显高度跳变。
3. 不应出现“模型加载中”这类一闪而过的文字。
4. provider/config 就绪后，自动切回正常聊天界面。
