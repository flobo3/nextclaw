# v0.13.136-ncp-react-ui-package-and-demo-migration

## 迭代完成说明

本次迭代新增了 `@nextclaw/ncp-react-ui` 包，目录为 `packages/ncp-packages/nextclaw-ncp-react-ui`，用于承载 NCP Agent 应用的纯展示 React 组件。

本次完成内容：

- 新建 `@nextclaw/ncp-react-ui` 包骨架、构建脚本、类型检查、ESLint 配置与样式子路径导出
- 迁移 `ncp-demo` 原有纯展示组件：
  - `chat-header`
  - `chat-input`
  - `error-box`
  - `message-bubble`
  - `message-list`
  - `message-part`
  - `session-actions`
  - `session-card`
  - `session-list`
- 将原本散落在 `apps/ncp-demo/frontend/src/styles.css` 中的组件样式抽离到新包的 `src/styles/index.css` 与 `src/styles/tokens.css`
- 将 `apps/ncp-demo/frontend` 改为消费 `@nextclaw/ncp-react-ui`，并删除本地已迁移的 `src/ui/*` 文件
- 更新根级 `package.json`，把新包纳入根级 `build`、`lint`、`tsc` 流程
- 更新 `pnpm-lock.yaml` 与 workspace 依赖链接

相关设计文档：

- [`@nextclaw/ncp-react-ui` 设计文档](../../plans/2026-03-17-ncp-react-ui-design.md)

## 测试/验证/验收方式

已执行验证：

- `PATH=/opt/homebrew/bin:$PATH pnpm install`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/ncp-packages/nextclaw-ncp-react-ui build`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/ncp-packages/nextclaw-ncp-react-ui lint`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/ncp-packages/nextclaw-ncp-react-ui tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/ncp-demo/frontend build`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/ncp-demo/frontend lint`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/ncp-demo/frontend tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/ncp-demo smoke:ui`

验证结果：

- 新包可独立构建、lint、类型检查通过
- `ncp-demo` 前端消费新包后可正常构建、lint、类型检查通过
- UI 冒烟验证通过，已覆盖 session 创建、消息发送、页面刷新后恢复、运行中 stop 等关键路径

## 发布/部署方式

本次变更未执行发布。

后续如需发布，按项目既有流程执行：

- 若仅内部开发验证：直接使用 workspace 依赖本地联调
- 若需要纳入统一校验：执行根级 `build`、`lint`、`tsc`
- 若未来需要正式对外发布该包，再将其纳入对应 release/version 流程

本次不适用：

- 远程 migration：不适用，未涉及后端数据库变更
- 线上部署：不适用，本次只触达前端展示层与新建本地 workspace 包

## 用户/产品视角的验收步骤

1. 启动 `ncp-demo` 前后端。
2. 打开页面后，确认左侧 session 列表与右侧聊天区样式正常。
3. 输入一条消息并发送，确认用户消息正常出现，Agent 响应正常渲染。
4. 创建一个新 session，确认会话切换后空态文案正常显示。
5. 切回旧 session，确认历史消息仍可正常显示。
6. 发送一条长任务消息，在运行中刷新页面，确认页面恢复后仍可看到 stop 按钮。
7. 点击 stop，确认会话恢复为 idle 状态。
