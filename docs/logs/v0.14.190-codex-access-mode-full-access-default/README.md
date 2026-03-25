# v0.14.190 Codex Access Mode Full Access Default

## 迭代完成说明

- 将 Codex NCP runtime 的产品级权限配置从“两字段”收敛为“单字段”：
  - 新字段：`accessMode`
  - 可选值：`read-only` / `workspace-write` / `full-access`
- 将默认权限模型改为 `full-access`，不再默认落到保守的只读/半可写形态。
- 在插件内部把产品字段映射到底层 Codex SDK 参数：
  - `read-only` -> `sandboxMode=read-only` + `approvalPolicy=never`
  - `workspace-write` -> `sandboxMode=workspace-write` + `approvalPolicy=never`
  - `full-access` -> `sandboxMode=danger-full-access` + `approvalPolicy=never`
- 从插件 schema / UI hints 中移除单独的 `approvalPolicy` 暴露，避免用户面对底层实现细节。
- 保留对历史 `sandboxMode` 配置的读取兼容，仅作为迁移期 fallback；新配置入口与默认语义统一以 `accessMode` 为准。
- 将权限映射逻辑抽到 [`codex-access-mode.ts`](../../../packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/codex-access-mode.ts)，避免主入口文件继续膨胀。

## 测试/验证/验收方式

- `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw exec vitest run src/cli/commands/codex-runtime-plugin-provider-routing.test.ts`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk build`
- `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/index.ts packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/codex-access-mode.ts packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/openclaw.plugin.json packages/nextclaw/src/cli/commands/codex-runtime-plugin-provider-routing.test.ts`

结果：

- `accessMode` 的默认值、显式覆盖、legacy `sandboxMode` fallback 均已通过回归测试。
- 构建通过。
- maintainability guard 无阻塞项；`index.ts` 已回到预算内，但仍接近预算线。

## 发布/部署方式

- 发布 `@nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk` 新版本。
- 让运行中的 NextClaw 实例升级到包含该版本的 Codex 插件后重载/重启服务。
- 若要让现网用户立即获得一致体验，插件设置入口应改为写入 `accessMode`，不再暴露 `approvalPolicy`。

## 用户/产品视角的验收步骤

1. 安装或升级包含本次修复的 Codex 插件版本。
2. 不填写任何权限相关配置，直接创建新的 `Codex` 会话。
3. 确认该会话默认具备 full access，而不是只读或半可写状态。
4. 在插件设置中将 `accessMode` 改为 `workspace-write`，确认会话仅在工作区内可写。
5. 再改为 `read-only`，确认写操作会稳定失败。
