# 迭代完成说明

- 将 NCP 主协议中的既有 run 读取语义从 `resume/reconnect` 收敛为 `stream`
- 将核心类型 `NcpResumeRequestPayload` 替换为 `NcpStreamRequestPayload`
- 将事件 `message.resume-request` 替换为 `message.stream-request`
- 将字段 `remoteRunId` 替换为 `runId`
- 将 `NcpAgentClientEndpoint.resume()` 替换为 `stream()`
- 将 HTTP agent transport 路由从 `GET /reconnect` 替换为 `GET /stream`
- 同步更新 `@nextclaw/ncp`、`@nextclaw/ncp-http-agent-client`、`@nextclaw/ncp-http-agent-server`、`@nextclaw/ncp-toolkit` 的测试、注释和导出
- 修正 `ncp-toolkit` 中一个测试的事件枚举写法，使当前类型系统可以完整通过校验

# 测试/验证/验收方式

- `pnpm -C packages/nextclaw-ncp tsc`
- `pnpm -C packages/nextclaw-ncp build`
- `pnpm -C packages/nextclaw-ncp-http-agent-client tsc`
- `pnpm -C packages/nextclaw-ncp-http-agent-client build`
- `pnpm -C packages/nextclaw-ncp-http-agent-client test`
- `pnpm -C packages/nextclaw-ncp-http-agent-server tsc`
- `pnpm -C packages/nextclaw-ncp-http-agent-server build`
- `pnpm -C packages/nextclaw-ncp-http-agent-server test`
- `pnpm -C packages/nextclaw-ncp-toolkit tsc`
- `pnpm -C packages/nextclaw-ncp-toolkit build`
- `pnpm -C packages/nextclaw-ncp-toolkit test`
- `pnpm -C packages/nextclaw-ncp lint`
- `pnpm -C packages/nextclaw-ncp-http-agent-client lint`
- `pnpm -C packages/nextclaw-ncp-http-agent-server lint`
- `pnpm -C packages/nextclaw-ncp-toolkit lint`

# 发布/部署方式

- 本次仅优化库内部 contract，未执行发布
- 后续如需发布，按既有 NPM 发布流程对受影响包联动发版：
  - `@nextclaw/ncp`
  - `@nextclaw/ncp-http-agent-client`
  - `@nextclaw/ncp-http-agent-server`
  - `@nextclaw/ncp-toolkit`

# 用户/产品视角的验收步骤

- 在任意基于 NCP 的 agent 场景中，只使用三类主动作：`send`、`stream`、`abort`
- 通过 HTTP transport 发起新请求时使用 `POST /send`
- 需要重新获取某个已有 run 的事件流时使用 `GET /stream?sessionId=<id>&runId=<id>`
- 中断运行时使用 `POST /abort`
- 确认上层集成不再依赖 `resume()`、`/reconnect`、`remoteRunId`
