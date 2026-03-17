# v0.13.144-nextclaw-ui-lightweight-auth

## 迭代完成说明

- 为 `nextclaw ui` 增加轻量认证配置：核心配置新增 `ui.auth.enabled / username / passwordHash / passwordSalt`，并沿用现有敏感字段脱敏机制，公开配置不会返回密码 hash/salt。
- UI server 新增认证服务与接口：`GET /api/auth/status`、`POST /api/auth/setup`、`POST /api/auth/login`、`POST /api/auth/logout`、`PUT /api/auth/password`、`PUT /api/auth/enabled`。
- 认证开启后，统一在 router 层保护 `/api/*` 与 `/ws`，仅放行 `GET /api/health`、`/api/auth/*` 与前端静态资源；未登录访问受保护接口返回 `401`。
- 会话采用 HttpOnly cookie + 服务端内存 session；进程重启后会话失效，符合首版预期。
- 前端新增认证状态 hook 与登录页 gate：认证开启且未登录时直接显示登录页；登录成功后保留原路由并进入原页面。
- 在 Runtime 页面新增 `Security` 卡片，支持首次 setup、启用/关闭认证、修改管理员密码、退出当前标签页。
- 本次新增文件统一采用 kebab-case / role-suffix 命名，包含 `auth.service.ts`、`login-page.tsx`、`use-auth.ts`、`runtime-security-card.tsx`。
- 发布语义按 minor 处理，并已补联动 changeset：`@nextclaw/core`、`@nextclaw/server`、`@nextclaw/ui`、`nextclaw`。

## 测试/验证/验收方式

- 服务端认证测试：
  - `pnpm --filter @nextclaw/server exec vitest run src/ui/router.auth.test.ts`
- 服务端类型检查：
  - `pnpm --filter @nextclaw/server tsc`
- 服务端构建：
  - `pnpm --filter @nextclaw/server build`
- 服务端定向 lint：
  - `pnpm --filter @nextclaw/server exec eslint src/ui/auth.service.ts src/ui/router.ts src/ui/server.ts src/ui/router/types.ts src/ui/router/auth.controller.ts src/ui/router.auth.test.ts`
- 前端类型检查：
  - `pnpm --filter @nextclaw/ui tsc`
- 前端构建：
  - `pnpm --filter @nextclaw/ui build`
- 前端定向 lint：
  - `pnpm --filter @nextclaw/ui exec eslint src/App.tsx src/components/auth/login-page.tsx src/components/config/runtime-security-card.tsx src/components/config/RuntimeConfig.tsx src/hooks/use-auth.ts src/lib/i18n.ts`

## 发布/部署方式

- 常规前端发布：
  - 构建 `@nextclaw/ui`
  - 构建 `@nextclaw/server`
  - 将新的 UI 静态资源与 server 一并部署到现有 `nextclaw ui` 运行环境
- 若已在服务器上运行 `nextclaw ui`：
  - 更新到包含本次改动的版本
  - 重启 UI 进程
  - 首次进入 Runtime -> `Security` 时按需开启认证
- 首版 session 为内存态：
  - 重启 UI 进程后需要重新登录，这是预期行为，不需要额外 migration

## 用户/产品视角的验收步骤

1. 启动 `nextclaw ui`，在未开启认证的默认状态下直接访问页面，确认现有本机使用路径不受影响。
2. 打开 Runtime 页面里的 `Security` 卡片，输入管理员用户名、密码、确认密码，点击“开启认证”，确认当前标签页自动处于已登录状态。
3. 新开一个浏览器隐身窗口访问同一个 UI 地址，确认不会直接进入业务页，而是看到登录页。
4. 在隐身窗口输入错误密码，确认登录失败；输入正确密码后，确认可以进入原目标页面并正常访问聊天、配置、会话、Cron、Marketplace 等页面。
5. 在已登录页面访问 `Security` 卡片，修改管理员密码，确认旧密码失效、新密码生效。
6. 在 `Security` 卡片关闭认证，确认页面恢复为无需登录即可访问；再次开启时，确认当前标签页会自动拿到新会话。
7. 重启 `nextclaw ui` 进程后重新访问，确认之前的登录态失效，需要重新登录。
