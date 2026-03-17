# v0.13.145-security-settings-entry-fix

## 迭代完成说明

- 修正 NextClaw UI 轻量认证入口的可发现性问题。
- 原先 `Security` 模块被放在 `Runtime` 页面内部，导致用户从“设置”视角进入时很难发现，也容易误以为功能没有交付。
- 现在新增独立的设置页入口 `Security`，并在设置侧边栏中显式展示。
- 新页面复用现有 `runtime-security-card`，没有重复实现认证逻辑。
- 同时保持新文件命名为 kebab-case：`security-config.tsx`。

## 测试/验证/验收方式

- 前端类型检查：
  - `pnpm --filter @nextclaw/ui tsc`
- 前端构建：
  - `pnpm --filter @nextclaw/ui build`
- 前端定向 lint：
  - `pnpm --filter @nextclaw/ui exec eslint src/App.tsx src/components/config/security-config.tsx src/components/config/RuntimeConfig.tsx src/components/layout/Sidebar.tsx src/lib/i18n.ts`
- 当前 lint 结果仅有既有 warning：
  - `packages/nextclaw-ui/src/components/config/RuntimeConfig.tsx` 的 `max-lines-per-function`

## 发布/部署方式

- 正常构建并部署 `@nextclaw/ui` 对应静态资源即可。
- 若通过 `nextclaw` 内置 UI 分发：
  - 重新构建 `packages/nextclaw-ui`
  - 按现有流程同步到 `nextclaw/ui-dist`
  - 重启 UI 进程

## 用户/产品视角的验收步骤

1. 启动 UI，进入设置区域。
2. 确认设置侧边栏中可以直接看到 `Security` 导航项。
3. 点击 `Security`，确认可以直接看到认证开关、首次 setup 表单、改密码与退出登录入口。
4. 进入 `Runtime` 页面，确认不再需要在那里寻找安全模块。
