# 迭代完成说明

- 收紧 `message` 工具的跨渠道发送契约：当 AI 显式把 `channel` 切到另一个渠道、却没有提供 `to/chatId` 时，不再沿用当前会话 route 假装成功，而是直接失败，避免出现“工具返回 sent，但用户实际收不到”的假成功。
- 补充全局 agent prompt、Feishu channel hint 与内置 `cross-channel-messaging` skill 文档，明确说明：
  - 只有“当前会话本身就是目标会话”时，才允许省略 `to/chatId`
  - 从 UI / CLI / 其它渠道主动发 Feishu 时，必须先解析出显式 Feishu route
  - 优先复用已有 session route，而不是跨渠道猜 user id
- 将前两轮已完成但尚未一起发布的改动并入本次 release batch：
  - skill 描述暴露进 `<available_skills>`，提升模型主动加载 `cross-channel-messaging` 的概率
  - `sessions_list` 支持按 `channel / to / accountId / sessionKey` 做 route 级过滤，减少 AI 广泛扫描 session 的需要
- 将仓库内已存在、但尚未纳入 release batch 的 `@nextclaw/runtime` 历史发布漂移一并收口，避免 release health 长期残留未发布 drift。

# 测试 / 验证 / 验收方式

- 单测：
  - `pnpm -C packages/nextclaw-core exec vitest run src/agent/tools/message.test.ts src/agent/context.test.ts src/agent/tools/sessions-send.test.ts`
- 类型 / 构建：
  - `pnpm -C packages/nextclaw-core tsc`
  - `pnpm -C packages/nextclaw-core build`
- 发布前检查：
  - `pnpm release:report:health`
  - `pnpm release:version`
  - `pnpm release:publish`
- 冒烟：
  - 使用本机已保存的 Feishu direct route 实发一条测试消息，验证从“无 target 假成功”切到“显式 route 真发送”的发布后链路。

# 发布 / 部署方式

- 本次属于 npm release batch。
- 执行顺序：
  1. 生成并提交覆盖本轮 batch 的 changeset
  2. 运行 `pnpm release:version`
  3. 运行 `pnpm release:publish`
  4. 检查 changeset 生成的版本、tag 与 changelog 是否齐全
  5. 提交 release 结果（含版本号、changelog、迭代日志）

# 用户 / 产品视角的验收步骤

1. 在一个非 Feishu 会话里对 AI 说“给我的飞书发条消息测试一下”。
2. 观察 AI 是否先解析已有 Feishu route，或明确要求补充 `open_id/chat_id`；不应再只传 `channel=feishu` 就声称发送成功。
3. 在 route 已知时，观察 AI 是否使用显式 Feishu target 发送，而不是回落到当前 UI/CLI 会话。
4. 在用户飞书侧确认收到测试消息。
5. 再测试 Weixin / 其它跨渠道通知场景，确认 AI 仍优先复用已有 session route，并用带过滤条件的 `sessions_list` 缩小候选。
