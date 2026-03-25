# v0.14.193-feishu-ncp-attachment-dispatch

## 迭代完成说明

- 修复飞书图片在真实 NCP 会话中的入站分发：
  - `packages/nextclaw/src/cli/commands/service-plugin-runtime-bridge.ts`
  - 已存在 `session_type` 的会话不再误走 legacy/direct `runtimePool.processDirect()`，而是直接发送到 `liveUiNcpAgent.agentClientEndpoint`
  - 本地媒体文件会被桥接层转成 NCP `file` part，纯图片无文本消息也不会在桥接层被静默丢弃
- 修复 Codex / Claude NCP runtime 对附件的真实消费：
  - `packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/codex-input-builder.ts`
  - `packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk/src/claude-runtime-context.ts`
  - 对本轮 `file` part 进行物化，生成本地临时文件路径或远端 URL 摘要，并拼接到 prompt 的 `Attached files for this turn` 区块
- 补齐针对 NCP 真链路的回归测试：
  - `packages/nextclaw/src/cli/commands/service-plugin-runtime-bridge.test.ts`
  - `packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/codex-input-builder.test.ts`
  - `packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk/src/claude-runtime-context.test.ts`
- 顺手修复本次发版所需的工作区构建链：
  - `packages/ncp-packages/nextclaw-ncp-react/tsconfig.json`
  - 为 `@nextclaw/ncp-react` 增加工作区源码 path 映射，恢复 `@nextclaw/ui -> nextclaw` 的构建依赖链

## 测试 / 验证 / 验收方式

- 单测：
  - `pnpm -C packages/nextclaw exec vitest run src/cli/commands/service-plugin-runtime-bridge.test.ts`
  - `node ../../nextclaw/node_modules/vitest/vitest.mjs run src/codex-input-builder.test.ts`
  - `node ../../nextclaw/node_modules/vitest/vitest.mjs run src/claude-runtime-context.test.ts`
- 定向 lint：
  - `pnpm exec eslint packages/nextclaw/src/cli/commands/service-plugin-runtime-bridge.ts packages/nextclaw/src/cli/commands/service.ts packages/nextclaw/src/cli/commands/service-plugin-runtime-bridge.test.ts packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/codex-input-builder.ts packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/codex-input-builder.test.ts packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk/src/claude-runtime-context.ts packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk/src/claude-runtime-context.test.ts`
- 定向构建：
  - `pnpm -C packages/ncp-packages/nextclaw-ncp build`
  - `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit build`
  - `pnpm -C packages/ncp-packages/nextclaw-ncp-http-agent-client build`
  - `pnpm -C packages/ncp-packages/nextclaw-ncp-react build`
  - `pnpm -C packages/nextclaw-ui build`
  - `pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk build`
  - `pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk build`
  - `pnpm -C packages/nextclaw build`
- 发布链额外检查：
  - `node scripts/check-release-groups.mjs`
- 说明：
  - 仓库当前基线的全量 `release:check` / 全量 `tsc` 仍会被与本次无关的历史问题阻塞，因此本次按受影响包最小充分验证执行，并保留 README / release-group / publish-guard 检查

## 发布 / 部署方式

1. 在仓库根目录创建 changeset，覆盖：
   - `@nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk`
   - `@nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk`
   - `@nextclaw/mcp`
   - `@nextclaw/server`
   - `nextclaw`
2. 执行：
   - `pnpm release:version`
3. 在隔离 worktree 中提交版本变更与源码修复
4. 使用项目根 `.npmrc` 执行发布：
   - `NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm changeset publish`
   - `NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm changeset tag`
5. 远端确认：
   - `npm view nextclaw version`
   - `npm view @nextclaw/server version`
   - `npm view @nextclaw/mcp version`
   - `npm view @nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk version`
   - `npm view @nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk version`

## 用户 / 产品视角的验收步骤

1. 升级到本次发布后的 `nextclaw` 与相关 plugin 版本。
2. 在 UI 中创建或继续一个 `codex` / `claude` 类型的 NCP session。
3. 通过飞书向这个会话发送一张图片，允许“纯图片无文本”或“图片 + 文本”两种情况。
4. 观察服务行为：
   - 不再落回 legacy/direct 会话
   - 消息能继续进入原 NCP session
   - 模型能基于附件给出回复，而不是表现为“图片像没发过去”
5. 若继续发送第二张图或文本追问，应复用同一 NCP session，而不是新开 legacy 会话。

## 红区触达与减债记录

### packages/nextclaw/src/cli/commands/service.ts

- 本次是否减债：否
- 说明：本次只在 `installPluginRuntimeBridge(...)` 注入 `sessionManager` 与 `getUiNcpAgent` 闭包，避免把 NCP 会话分发逻辑继续堆进 `service.ts` 内部。
- 下一步拆分缝：可把 service 启动阶段的“bridge / ui / plugin gateway”装配逻辑抽成独立 bootstrap 模块，进一步缩小 `startGateway()`。
