# v0.14.168-remote-runtime-single-owner

## 迭代完成说明

- 修复 `pnpm dev start` / `serve` 在同一个 `NEXTCLAW_HOME` 下与另一条 remote-enabled NextClaw 进程并存时，会互相争抢同一 remote connector、导致终端持续输出 `Remote connector disconnected. Reconnecting in 3.xs...` 的问题。
- 为 NextClaw remote runtime 增加本地单 owner 守卫：同一个 `NEXTCLAW_HOME` 下只允许一个进程托管 remote connector；第二个进程不再尝试抢连平台，而是直接进入 `runtime.state=error`，并附带明确 `lastError`。
- 补齐 websocket close reason 的显式错误化：当平台以 `Replaced by a newer connector session.` 关闭旧连接时，旧进程会停止重连并保留明确错误，不再把“被新会话替换”伪装成普通网络抖动。
- 新增回归测试，覆盖“本地 owner 冲突显式失败”和“平台主动替换 connector 时立即停在 error”两条路径。

## 测试 / 验证 / 验收方式

- 定向回归测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw test -- --run src/cli/commands/remote-connector-runtime.test.ts src/cli/commands/service-remote-runtime.test.ts`
- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw tsc --pretty false`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-remote tsc --pretty false`
- 定向 lint：
  - `PATH=/opt/homebrew/bin:$PATH pnpm exec eslint packages/nextclaw/src/cli/commands/service-remote-runtime.ts packages/nextclaw/src/cli/commands/service-remote-runtime.test.ts packages/nextclaw/src/cli/commands/remote-connector-runtime.test.ts packages/nextclaw-remote/src/remote-service-module.ts packages/nextclaw-remote/src/remote-connector.ts packages/nextclaw-remote/src/remote-connector-error.ts`
- 可维护性闸门：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw/src/cli/commands/service-remote-runtime.ts packages/nextclaw/src/cli/commands/service-remote-runtime.test.ts packages/nextclaw/src/cli/commands/remote-connector-runtime.test.ts packages/nextclaw-remote/src/remote-service-module.ts packages/nextclaw-remote/src/remote-connector.ts packages/nextclaw-remote/src/remote-connector-error.ts`
- 真实冒烟：
  - 使用隔离 `NEXTCLAW_HOME` 复制现有配置，先启动第一个 `serve --ui-port 19070` 进程，再在同一 `NEXTCLAW_HOME` 下启动第二个 `serve --ui-port 19071` 进程。
  - 观察结果：
    - 第一个进程 remote 正常进入 `connected`。
    - 第二个进程终端立即输出 `Remote access is already owned by local NextClaw process PID ...`，不再出现 `Remote connector disconnected / Reconnecting` 循环。
    - `curl http://127.0.0.1:19071/api/remote/status` 返回 `runtime.state = error` 且 `runtime.lastError` 为明确 owner 冲突原因。

## 发布 / 部署方式

- 本次尚未执行发布或部署。
- 若后续需要发布，按现有 NPM release 流程执行受影响包版本变更、`release:version`、`release:publish`，并在安装态复验 remote 单 owner 行为。

## 用户 / 产品视角的验收步骤

1. 保持某个 `NEXTCLAW_HOME` 下 remote access 为启用状态。
2. 启动一个 NextClaw UI/API 进程，并确认 remote 状态为 `connected`。
3. 在同一个 `NEXTCLAW_HOME` 下再启动第二个 `pnpm dev start` 或 `serve` 进程。
4. 确认第二个进程不再持续输出 `Remote connector disconnected. Reconnecting in 3.xs...`。
5. 确认第二个进程直接提示“remote 已被本地/运行中的 NextClaw 进程占用”，并在 UI 或 `/api/remote/status` 中看到 `state=error` 与明确 `lastError`。
6. 如需让第二个进程真正接管 remote，先停止 owner 进程或改用不同的 `NEXTCLAW_HOME`，再重启第二个进程，确认其可恢复 `connected`。
