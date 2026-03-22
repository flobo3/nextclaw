# v0.14.116-server-cors-runtime-stability

## 迭代完成说明

- 修复 `@nextclaw/server` 在 Node 长运行场景下的高风险中间件链路：
  - 移除 `packages/nextclaw-server/src/ui/server.ts` 中对 `hono/cors` 的依赖。
  - 改为显式实现 `/api/*` 的 CORS 响应逻辑，只保留 NextClaw 当前真实需要的行为：
    - 允许显式配置的 `corsOrigins`
    - 默认仅放行 `http://localhost:*` 与 `http://127.0.0.1:*`
    - 正确处理带凭证请求与 `OPTIONS` 预检
  - 保持 `/api/health`、登录态 cookie、开发代理场景的兼容行为。
- 新增真实 HTTP 层集成测试 `packages/nextclaw-server/src/ui/server.cors.test.ts`，覆盖：
  - 允许来源的预检请求
  - 允许来源的实际 `GET /api/health`
  - 默认 localhost 策略
  - 非允许来源不返回 CORS 头
- 根因判断：
  - 线上现象表现为 `ERR_EMPTY_RESPONSE` / `nginx 502` / status 不健康 / remote 不可用。
  - 仓库外部排查发现 `@hono/node-server` 与 `hono/cors` 组合在 Node 场景存在已知稳定性风险；本次从主链路移除该组合，避免继续把服务稳定性压在该中间件实现上。

## 测试/验证/验收方式

- 受影响包验证：
  - `pnpm -C packages/nextclaw-server test -- --run src/ui/server.cors.test.ts`
  - `pnpm -C packages/nextclaw-server lint`
  - `pnpm -C packages/nextclaw-server tsc`
  - `pnpm -C packages/nextclaw-server build`
- 预期结果：
  - 新增的 CORS 集成测试全部通过
  - `lint` 仅剩仓库既有 warning，无新增 error
  - `tsc` 与 `build` 通过

## 发布/部署方式

- NPM 发布按项目流程执行：
  - `pnpm changeset`
  - `pnpm release:version`
  - `pnpm release:publish`
- 线上部署：
  - 在云服务器升级到包含本次修复的 `nextclaw` / `@nextclaw/server` 版本
  - 重启 NextClaw 服务
  - 若使用 Nginx，对 upstream 保持 `http://127.0.0.1:<ui-port>`
- 当前阻塞：
  - 本次会话中对 `8.219.57.52` 的 SSH 登录失败，无法直接完成远端替换与线上冒烟；需要可用 SSH 凭据后再执行服务器部署闭环

## 用户/产品视角的验收步骤

1. 将服务器上的 NextClaw 升级到包含本次修复的版本并重启。
2. 访问 `http://<server-ip>:<ui-port>/api/health`，确认返回 `200` 且 body 中包含 `"ok":true`、`"status":"ok"`。
3. 若通过 Nginx 暴露入口，访问 `http://<server-ip>/api/health`，确认不再返回 `502`。
4. 打开 NextClaw Web UI，等待一段时间后刷新页面，确认不再出现 `ERR_EMPTY_RESPONSE`。
5. 在 UI 中观察服务状态，确认保持健康；再验证 remote 访问链路可用。
