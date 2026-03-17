# v0.13.147-ui-auth-chat-stream-cookie-fix

## 迭代完成说明

- 修复 `nextclaw ui` 轻量认证开启后，聊天发送统一返回 `{"ok":false,"error":{"code":"UNAUTHORIZED","message":"Authentication required."}}` 的问题。
- 根因是聊天流式请求没有复用统一 API client，而是在 `packages/nextclaw-ui/src/api/config.ts` 中直接调用了裸 `fetch`。
- 这段流式 `fetch` 缺少 `credentials: 'include'`，导致管理员已登录后，SSE 请求仍然不会带上 HttpOnly session cookie。
- 服务端因此正确返回了 `401 UNAUTHORIZED`，但前端表现成“已经登录却什么都发不出去”。
- 现在流式聊天与恢复 run 的 SSE 请求都会显式携带 cookie，和普通 `/api/*` 请求保持一致。

## 测试/验证/验收方式

- 前端定向 lint：
  - `pnpm --filter @nextclaw/ui exec eslint src/api/config.ts`
- 前端类型检查：
  - `pnpm --filter @nextclaw/ui tsc`
- 前端构建：
  - `pnpm --filter @nextclaw/ui build`

## 发布/部署方式

- 重新构建并部署 `@nextclaw/ui` 静态资源。
- 若通过 `nextclaw` 内置 UI 分发：
  - 重新构建 `packages/nextclaw-ui`
  - 同步到 `nextclaw/ui-dist`
  - 重启 UI 进程

## 用户/产品视角的验收步骤

1. 开启 UI 认证并使用管理员账号登录。
2. 在聊天页发送一条消息。
3. 确认请求不再返回 `UNAUTHORIZED`。
4. 确认 SSE 流正常建立，聊天可继续收到增量回复。
