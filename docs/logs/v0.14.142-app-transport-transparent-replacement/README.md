# v0.14.142-app-transport-transparent-replacement

## 迭代完成说明

本次迭代修正了 `appClient` / `AppTransport` 在 remote multiplex 落地中的边界偏差，目标是恢复“真正无感知替换”：

- transport 不再通过 `terminalEventNames` / `terminalEventPayloadTypes` 理解上层业务终止语义
- 本地 SSE 读取层恢复为纯事件透传，不再因为缺少 `final` 就在 transport 层报错
- remote adaptor 恢复为纯帧桥接：`stream.event` 透传原始 SSE 事件，`stream.end` 只表示 transport EOF
- chat / NCP 等上层调用方改为自行解释 `final` / `error`
- 补充设计原则文档：[App Transport Transparent Replacement Principle](../../../designs/2026-03-23-app-transport-transparent-replacement-principle.md)

## 测试/验证/验收方式

本次执行的验证：

- `pnpm -C packages/nextclaw-ui test -- --run src/transport/sse-stream.test.ts src/components/chat/ncp/ncp-app-client-fetch.test.ts src/api/config.stream.test.ts`
- `pnpm -C packages/nextclaw-ui tsc --pretty false`
- `pnpm -C packages/nextclaw-ui build`
- `pnpm -C packages/nextclaw-remote tsc --pretty false`
- `pnpm -C packages/nextclaw-remote build`
- `pnpm -C workers/nextclaw-provider-gateway-api tsc --pretty false`
- `pnpm -C packages/nextclaw build`
- `pnpm smoke:ncp-chat -- --base-url http://127.0.0.1:18792 --prompt "Reply exactly OK" --json`
- `node scripts/remote-app-transport-smoke.mjs`

关键观察点：

- 本地真实实例返回 `ok: true`，`assistantText: "OK"`，`terminalEvent: "run.finished"`
- 首页加载的新 bundle 为 `/assets/index-DdOd3c_-.js`
- remote transport smoke 通过，且 `final` 仍为 `stream.event`，`stream.end` 不再携带业务结果

## 发布/部署方式

本次代码层面的发布准备已完成：

- 重新构建 `@nextclaw/ui` 与 `nextclaw`，并将最新 UI bundle 拷贝进 `packages/nextclaw/ui-dist`
- 如需对外发布 `nextclaw` / 相关包，应在独立 release 上下文中整合本轮变更与当下工作区中的其它并行版本变更，再执行项目既有 release 流程

本次未直接执行对外 npm / GitHub / 线上部署动作，原因是当前工作区存在其它并行发布改动，直接对外发布会把不属于本次修复范围的变更一并带出。

## 用户/产品视角的验收步骤

1. 启动本地实例并打开聊天页。
2. 发送一条简单消息，例如 `Reply exactly OK`。
3. 确认消息流结束后页面不再弹出 `stream ended without final event`。
4. 确认刚发送的用户消息和 AI 回复仍留在当前视图中，不会在完成后消失。
5. 确认输入框不会被刚发出的内容错误回填。
6. 在 remote access 场景复验时，确认高频动态请求通过 `appClient` 收口到 multiplex 长连接，`final` 仍以普通流事件到达上层，而不是被 transport 吃掉。
