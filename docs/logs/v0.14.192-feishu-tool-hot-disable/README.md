# 2026-03-25 v0.14.192-feishu-tool-hot-disable

## 迭代完成说明

- 修复飞书相关 channel 配置热更新后的 agent tool 可见性问题。
- 当 `channels.feishu.*` 发生变更时，reload plan 现在会同步触发 agent runtime 刷新，不再只重启 channels。
- 扩展工具注册现在会按当前配置与上下文动态判断可用性；当扩展 factory 返回空时，该 tool 不再出现在模型可见工具列表里，也不会继续以旧 alias 残留。
- 修复 `pnpm dev start` 实际命中的 UI NCP 链路：`NextclawNcpToolRegistry` 现在会在 `listTools` / `getTool` / `getToolDefinitions` 阶段统一过滤当前不可用的 core/扩展工具，避免已 disable 的飞书 tool 仍然注入到 system prompt。
- 补充回归测试，覆盖：
  - `channels.feishu.enabled` 变更会触发 `reloadAgent`
  - `AgentLoop` runtime config 从启用切到禁用后，`feishu_doc` 会从 system prompt 工具列表中移除
  - 同一个 UI NCP agent 在不重启的前提下，从启用切到禁用后，下一轮请求的 tool catalog 会立即移除 `feishu_doc`

## 测试/验证/验收方式

- 定向测试：
  - `pnpm -C packages/nextclaw-core exec vitest run src/config/reload.test.ts src/agent/loop.tool-catalog.test.ts`
  - `pnpm -C packages/nextclaw exec vitest run src/cli/commands/ncp/create-ui-ncp-agent.test.ts src/cli/commands/ncp/nextclaw-ncp-context-builder.test.ts src/cli/commands/ncp/nextclaw-ncp-tool-registry.mcp.test.ts`
- 类型检查：
  - `pnpm -C packages/nextclaw-core exec tsc --noEmit`
  - `pnpm -C packages/nextclaw exec tsc --noEmit`
- lint：
  - `pnpm -C packages/nextclaw-core lint`
  - 结果：通过，存在仓库既有 warning，无本次改动新增 error
  - `pnpm -C packages/nextclaw lint`
  - 结果：通过，存在仓库既有 warning，无本次改动新增 error
- build：
  - `pnpm -C packages/nextclaw-core build`
  - `pnpm -C packages/nextclaw build`
- 可维护性检查：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-tool-registry.ts packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.test.ts packages/nextclaw-core/src/agent/tools/base.ts packages/nextclaw-core/src/agent/tools/registry.ts packages/nextclaw-core/src/extensions/tool-adapter.ts packages/nextclaw-core/src/config/reload.ts packages/nextclaw-core/src/config/reload.test.ts packages/nextclaw-core/src/agent/loop.tool-catalog.test.ts`
  - 结果：0 error，3 warnings；`create-ui-ncp-agent.test.ts` 接近测试文件预算，`loop.tool-catalog.test.ts` 增长明显但仍低于预算，`nextclaw-ncp-tool-registry.ts` 接近源码文件预算

## 发布/部署方式

- 本次变更只修改运行时逻辑与测试，无独立部署脚本变更。
- 按常规 NextClaw 发布流程合入后，至少发布受影响的 `@nextclaw/core` 与 `nextclaw`（以及依赖它们的联动包，如本轮版本策略要求）。
- 若用于本地 `pnpm dev start` 验证，无需手动重启整个开发进程；保存配置并等待热更新生效即可。

## 用户/产品视角的验收步骤

1. 启动开发环境，例如 `pnpm dev start`。
2. 保证当前配置里飞书可用，并在聊天中询问“有哪些工具”。
3. 观察返回里包含飞书工具，例如 `feishu_doc`。
4. 将飞书关闭，例如把 `channels.feishu.enabled` 改为 `false`，或移除使其不再是 enabled + configured。
5. 不重启整个开发进程，等待配置热更新完成。
6. 再次询问“有哪些工具”。
7. 验证结果中不再出现飞书相关 tool；若重新启用飞书，再次询问时应重新出现。
