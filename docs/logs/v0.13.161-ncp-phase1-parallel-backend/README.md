# v0.13.161-ncp-phase1-parallel-backend

## 迭代完成说明

本次完成了 NCP `Phase 1` 的后端并行链路落地。

主要改动：

1. 在 `@nextclaw/server` 挂载独立的并行 NCP 路由：
   - `/api/ncp/agent/send`
   - `/api/ncp/agent/stream`
   - `/api/ncp/agent/abort`
   - `/api/ncp/sessions/*`
2. 在 `nextclaw` 内新增独立 NCP backend 组装，不复用 legacy chat runtime 编排。
3. 新增基于现有 `SessionManager` 的 `AgentSessionStore` adapter，让 NCP backend 直接读写现有 session 存储。
4. 新增基于现有 `ProviderManager` 的 NCP LLM bridge，让 NCP runtime 走当前 provider 配置。
5. 新增服务端路由测试，覆盖新的并行 NCP agent/session API。

专项说明：

- 存储适配说明见：[NCP Phase 1 Session Store Adapter](../../designs/2026-03-17-ncp-phase1-session-store-adapter.md)

## 测试/验证/验收方式

已执行：

1. `PATH=/opt/homebrew/bin:$PATH pnpm install`
2. `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server tsc`
3. `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw tsc`
4. `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server lint`
5. `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw lint`
6. `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server build`
7. `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw build`
8. `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server test -- --run src/ui/router.ncp-agent.test.ts`

结果：

1. `tsc/build` 通过
2. `lint` 仅有仓库内既有超长文件/函数 warning，无新增 error
3. 新增 NCP 路由测试通过，验证了并行 session API 与 agent send/abort 入口可用

## 发布/部署方式

本迭代未要求立即切默认链路，也未要求删除 legacy。

部署方式：

1. 按现有 `nextclaw`/`@nextclaw/server` 发布流程发布受影响包
2. 启动 UI server 后，新并行 NCP 路由会随服务一起提供
3. 当前默认用户链路仍是 legacy；本阶段主要用于为下一阶段前端切换接入做准备

## 用户/产品视角的验收步骤

1. 启动当前 NextClaw UI 服务
2. 访问 `GET /api/ncp/sessions`，确认能看到现有 session 列表
3. 访问 `GET /api/ncp/sessions/:sessionId/messages`，确认能读取已有会话历史
4. 调用 `POST /api/ncp/agent/send` 发送一条用户消息，确认 NCP agent 链路能返回流式事件
5. 调用 `POST /api/ncp/agent/abort`，确认 abort 接口可用
6. 再回到 legacy `/api/chat/*` 与 `/api/sessions/*`，确认旧链路仍可用且未被污染
