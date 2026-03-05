# v0.0.1-chat-input-loading-vs-empty

## 1) 迭代完成说明（改了什么）
- 聊天输入框新增状态区分：
  - 未加载（`config/config-meta` 未完成首次获取）
  - 已加载但无可用模型（确实为空）
- 输入框文案与提示分支更新：
  - 未加载时显示“模型加载中，请稍候...”
  - 已加载为空时才显示“暂无可用模型，请先配置提供商。”
- 输入框下方提示条分离：
  - 加载态显示灰色加载提示（无“去配置提供商”跳转）
  - 空态显示黄色配置提示（保留“去配置提供商”按钮）
- 模型下拉空列表文案同步区分加载态/空态。
- 新增 i18n 文案键 `chatModelOptionsLoading`。

涉及文件：
- `packages/nextclaw-ui/src/components/chat/ChatInputBar.tsx`
- `packages/nextclaw-ui/src/components/chat/ChatConversationPanel.tsx`
- `packages/nextclaw-ui/src/lib/i18n.ts`

## 2) 测试/验证/验收方式
执行环境说明：当前 shell 未内置 `pnpm`，命令使用 `PATH=/opt/homebrew/bin:$PATH` 前缀。

已执行：
- `PATH=/opt/homebrew/bin:$PATH pnpm build`（通过）
- `PATH=/opt/homebrew/bin:$PATH pnpm lint`（通过；仅仓库既有 warning，无 error）
- `PATH=/opt/homebrew/bin:$PATH pnpm tsc`（通过）

冒烟（UI 最小可访问性）：
- 启动 `@nextclaw/ui preview` 于 `127.0.0.1:4373`，请求 `/chat`
- 观察点：
  - 返回 `HTTP/1.1 200 OK`
  - 返回 HTML 文档头（`<!DOCTYPE html>`）
- 结束后自动清理 preview 进程，无残留。

## 3) 发布/部署方式
本次为前端 UI 交互逻辑改动，无后端/数据库改动。

建议发布流程：
1. 执行 `PATH=/opt/homebrew/bin:$PATH pnpm build && PATH=/opt/homebrew/bin:$PATH pnpm lint && PATH=/opt/homebrew/bin:$PATH pnpm tsc`
2. 按项目前端发布流程执行（可使用 `/release-frontend`）
3. 发布后线上打开聊天页验证输入框“加载态/空态”分支行为

不适用项：
- 远程 migration：不适用（无后端/数据库变更）

## 4) 用户/产品视角的验收步骤
1. 打开聊天页后，在配置尚未返回的瞬间，输入框应显示“模型加载中，请稍候...”，不应显示“先配置提供商”。
2. 当配置加载完成且确实没有可用模型时，输入框与页面提示才显示“暂无可用模型，请先配置提供商。”并出现“去配置提供商”入口。
3. 当存在可用模型时，输入框恢复正常占位文案（输入消息提示），且不显示空态配置提示。
4. 全程不应出现“未加载误判为空”的闪烁提示。
