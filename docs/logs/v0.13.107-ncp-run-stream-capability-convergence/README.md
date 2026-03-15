# 迭代完成说明

- 将 NCP endpoint manifest 中的能力位从 `supportsSessionResume` 收敛为 `supportsRunStream`
- 将 HTTP agent server 中的存量流提供者从 `replayProvider` / `NcpHttpAgentReplayProvider` 收敛为 `streamProvider` / `NcpHttpAgentStreamProvider`
- 同步更新 `@nextclaw/ncp`、`@nextclaw/ncp-http-agent-client`、`@nextclaw/ncp-http-agent-server` 的类型、实现、测试与文档
- 同步更新设计文档与使用示例中的旧命名，避免库主 contract 与文档继续分叉

# 测试/验证/验收方式

- `pnpm -C packages/nextclaw-ncp tsc`
- `pnpm -C packages/nextclaw-ncp build`
- `pnpm -C packages/nextclaw-ncp lint`
- `pnpm -C packages/nextclaw-ncp-http-agent-client tsc`
- `pnpm -C packages/nextclaw-ncp-http-agent-client build`
- `pnpm -C packages/nextclaw-ncp-http-agent-client test`
- `pnpm -C packages/nextclaw-ncp-http-agent-client lint`
- `pnpm -C packages/nextclaw-ncp-http-agent-server tsc`
- `pnpm -C packages/nextclaw-ncp-http-agent-server build`
- `pnpm -C packages/nextclaw-ncp-http-agent-server test`
- `pnpm -C packages/nextclaw-ncp-http-agent-server lint`

# 发布/部署方式

- 本次仅完成库与文档收敛，未执行发布
- 如需发布，应联动发版以下包：
  - `@nextclaw/ncp`
  - `@nextclaw/ncp-http-agent-client`
  - `@nextclaw/ncp-http-agent-server`

# 用户/产品视角的验收步骤

- 查看 endpoint manifest，只暴露 `supportsStreaming`、`supportsAbort`、`supportsRunStream` 等当前能力位
- 配置 HTTP agent server 时，如需从持久化层读取既有 run 事件流，使用 `streamProvider`
- 不再在代码与文档中依赖 `supportsSessionResume`、`replayProvider`
