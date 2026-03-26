# v0.14.232-remove-legacy-chat-chain

## 迭代完成说明

- 删除 Web UI 中已废弃的 legacy 聊天入口、页面、runtime 控制器、旧 stream 适配层与对应测试，只保留 NCP 聊天主链路。
- 删除服务端 `/api/chat/*`、`/api/sessions/*` 旧路由、对应 controller/test，以及 service 启动阶段的 legacy chat runtime 注入代码。
- 将会话管理页、session label 更新、实时 query bridge 等前端逻辑统一收敛到 NCP-only 契约。
- 保留现有存储层与数据格式，不改 `SessionManager` 相关存储实现，只删除已经不再使用的 legacy 链路代码点。
- 补充受影响目录的 `README.md` 预算豁免说明，消除本次删除 legacy 链路后触发的目录级可维护性闸门阻塞。

## 测试 / 验证 / 验收方式

- `pnpm --filter @nextclaw/ui exec tsc --noEmit`
- `pnpm --filter @nextclaw/server exec tsc --noEmit`
- `pnpm --filter nextclaw exec tsc --noEmit`
- `pnpm --filter @nextclaw/ui exec vitest run src/components/chat/ChatSidebar.test.tsx src/components/chat/chat-session-preference-sync.test.ts src/components/chat/ncp/ncp-chat-page-data.test.ts`
- `pnpm --filter @nextclaw/server exec vitest run src/ui/router.ncp-agent.test.ts`
- `pnpm --filter nextclaw exec vitest run src/cli/commands/service-deferred-ncp-agent.test.ts`

## 发布 / 部署方式

- 本次未执行发布。
- 后续如需发布，按现有 `nextclaw` / `@nextclaw/server` / `@nextclaw/ui` 流程走常规版本发布即可，无需存储迁移。

## 用户 / 产品视角的验收步骤

1. 启动 `nextclaw service`，打开 UI。
2. 进入聊天页，确认直接进入当前 NCP 聊天界面，不再存在 legacy 回退入口。
3. 创建新会话、发送消息、停止运行、删除会话，确认聊天和会话管理都正常。
4. 进入 Sessions 页面，确认可以查看 NCP 会话、查看消息、修改标签/模型、删除会话。
5. 确认旧 `/api/chat/*`、`/api/sessions/*` 相关能力不再是 UI 运行前提，现有 NCP 主链路仍可正常工作。
