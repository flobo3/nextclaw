# v0.14.195-feishu-tool-hot-reload-root-fix

## 迭代完成说明

- 修复 `channels.*` 热更新只重启 channel/agent、却没有重建 plugin registry 的根因问题。
- 现在切换 `channels.feishu.enabled` 时，会在同一次热更新里同步 `reloadPlugins`，确保飞书这类在插件注册阶段产出的 tool 能被真实移除。
- 更新了 `buildReloadPlan` 的测试，覆盖 `channels.feishu.enabled` 变更时需要 `reloadPlugins + restartChannels + reloadAgent` 的行为。

## 测试/验证/验收方式

- 单测：
  - `pnpm -C packages/nextclaw-core exec vitest run src/config/reload.test.ts`
  - `pnpm -C packages/nextclaw exec vitest run src/cli/commands/ncp/create-ui-ncp-agent.test.ts`
- 类型检查：
  - `pnpm -C packages/nextclaw-core exec tsc --noEmit`
- 可维护性检查：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-core/src/config/reload.ts packages/nextclaw-core/src/config/reload.test.ts`
- 真实 AI 回复冒烟：
  - 新起临时 `NEXTCLAW_HOME` 的 `pnpm dev start`
  - 先将 `channels.feishu.enabled=true`，确认 AI 真回复列出 `feishu_*`
  - 再将 `channels.feishu.enabled=false`，确认日志出现 `Config reload: plugins reloaded.`
  - 用全新 session 再问一次工具列表，AI 真回复里不再包含任何 `feishu_*`
- 当前本机 `http://127.0.0.1:18792` 也已实测：`~/.nextclaw/config.json` 中 `channels.feishu.enabled=false` 时，AI 真回复不再包含飞书工具。

## 发布/部署方式

- 本次未执行发布。
- 若后续需要发布，应按项目既有 release 流程完成版本提升、发布和发布后冒烟。

## 用户/产品视角的验收步骤

1. 保持 `pnpm dev start` 运行。
2. 在配置里将飞书开启，发起一个全新会话，询问“现在有哪些工具”，确认回复里能看到 `feishu_*`。
3. 不重启 `pnpm dev start`，直接把 `channels.feishu.enabled` 改成 `false`。
4. 观察服务日志，确认出现 `Config reload: plugins reloaded.`。
5. 再发起一个全新会话，询问同样的问题，确认回复里已没有任何 `feishu_*`。
