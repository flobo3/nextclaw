# 迭代完成说明

本次迭代修复了共享聊天 UI 在宿主 `nextclaw-ui` 中出现的基础展示失真问题，重点不是继续在单个组件上打补丁，而是补上共享 UI 的 Tailwind 样式扫描链路。

本次改动包括：

- 将 `packages/nextclaw-ui/tailwind.config.js` 的 `content` 扫描范围扩展到 `../nextclaw-agent-chat-ui/src/**/*.{js,ts,jsx,tsx}`，确保共享展示层新增的 Tailwind class 能被宿主应用正确产出 CSS。
- 将 stop 按钮的中心图标调整为显式的深色实心方块，避免继续依赖继承色导致视觉不可见。
- 将 AI 头像样式收敛到更显性的深色圆形底座，并补上边框，提升在浅色界面中的可见性。
- 保持修复落在共享展示层与宿主样式编译配置层，不向 NCP 编排层或业务层引入特判。

# 测试/验证/验收方式

已执行：

- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui test -- src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui build`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui lint`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui build`

结果：

- 共享输入栏定向测试通过。
- 共享 UI 类型检查通过。
- 共享 UI 构建通过。
- 共享 UI lint 通过。
- 宿主 UI 构建通过，确认 Tailwind 配置变更可正常参与构建。

# 发布/部署方式

本次为前端共享展示层与宿主样式编译配置修复，不涉及后端、数据库或 migration。

如需继续集成验证：

- 保持当前工作区代码
- 重启 `nextclaw-ui` dev server，使 Tailwind 重新加载 `content` 配置
- 分别在 legacy 与 `?chatChain=ncp` 两条链路下检查 stop 按钮与 AI 头像显示

# 用户/产品视角的验收步骤

1. 重启前端开发服务并打开聊天页面。
2. 发送一条消息，让输入区进入 sending 状态，确认右下角 `Stop` 按钮中心为可见的实心方块。
3. 等待 AI 回复，确认 AI 消息卡片左侧能看到头像，且在浅色背景下不会与背景融在一起。
4. 切换到 `?chatChain=ncp` 重复一次，确认新旧链路下共享 UI 呈现一致。
