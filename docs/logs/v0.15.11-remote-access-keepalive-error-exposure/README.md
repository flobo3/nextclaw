# 迭代完成说明

- 为远程 connector 增加了轻量 keepalive 帧发送，避免连接建立后因长时间静默而被上游网络或 relay 异常断开。
- 远程访问页在“非鉴权类错误”场景下不再只显示泛化提示，而是把真实 `runtime.lastError` 追加展示出来，便于定位实际故障。
- 补充了远程 connector keepalive 行为测试，以及远程访问页错误展示测试。

# 测试/验证/验收方式

- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw exec vitest run src/cli/commands/remote-connector-runtime.test.ts`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui exec vitest run src/remote/remote-access-feedback.service.test.ts`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-remote tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw tsc`
- 本机运行态核查：`/Users/peiwang/.nextclaw/run/service.json` 当前记录的真实错误为 `Remote connector websocket closed (code 1006, unclean).`，与页面“已断开”及 platform 按钮灰掉现象一致。
- 已知阻塞：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc` 失败，原因是工作区现有文件 `/Users/peiwang/Projects/nextbot/packages/nextclaw-ui/src/components/chat/adapters/chat-message.file-operation-card.ts` 引用了 `@nextclaw/agent-chat-ui` 中未导出的类型，和本次远程访问修复无关。
  - `PATH=/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard` 仍被上述同批未完成的 chat file-operation 改动阻塞；本次修改涉及的 `/Users/peiwang/Projects/nextbot/packages/nextclaw-remote/src/remote-connector.ts` 已压回预算线内，仅剩 near-budget warning。

# 发布/部署方式

- 本次只完成代码修复与本地验证，未执行发布。
- 若要让当前机器上的已安装 `nextclaw` 真正吃到修复，需要后续按正常发布链路重新构建并发布包含 `@nextclaw/remote`、`nextclaw-ui`、`nextclaw` 的版本，再升级本地安装。

# 用户/产品视角的验收步骤

1. 启动或重启 NextClaw 服务，并重新开启远程访问。
2. 打开本机远程访问页，确认不再长期停留在泛化“已断开”提示；若仍失败，页面应直接暴露具体错误文本。
3. 打开 platform console，确认目标实例能稳定进入 `online`，`Open in Web` / `Open With Fixed Domain` 不再长期灰掉。
4. 保持服务空闲一段时间后再次刷新 platform console，确认实例不会因为长连接静默掉线而再次回到 `offline`。
