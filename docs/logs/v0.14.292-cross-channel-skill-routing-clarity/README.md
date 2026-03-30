# 迭代完成说明

本次聚焦修复 AI 在“通过微信等渠道主动发消息”场景下的 skill 使用清晰度问题，主要包含两部分：

- 强化 builtin skill 暴露信息：
  - 调整 [skills.ts](../../../packages/nextclaw-core/src/agent/skills.ts)，让系统提示中的 skill 清单除了 `name` 和 `location`，还会携带 frontmatter `description`。
  - 这样模型在扫描 `<available_skills>` 时，不再只能靠 skill 名称猜测用途，而能更明确判断何时应加载 `cross-channel-messaging`。
- 强化 [cross-channel-messaging](../../../packages/nextclaw-core/src/agent/skills/cross-channel-messaging/SKILL.md) 的执行说明：
  - 补充明确触发词，告诉模型在“notify me when done / send this to my Weixin / forward to another chat”这类表述下应主动加载该 skill。
  - 补充“Authoritative Route Sources”，强调应优先读取系统已注入的 tool hints / 已知 route，而不是忽略上下文后重新问用户。
  - 补充 Weixin 专项规则，明确：
    - 先检查 `Known Weixin self-notify route` / `Known Weixin proactive routes` / `Default Weixin accountId`
    - 已知唯一 route 时直接使用，不要重复追问
    - 仅缺 `user_id` 时，只问 `user_id@im.wechat`
    - 禁止调用飞书/其他渠道用户查询工具去猜 Weixin user id
- 补充 [context.test.ts](../../../packages/nextclaw-core/src/agent/context.test.ts)，验证 available skills 区块会包含 skill description。

# 测试/验证/验收方式

本次触达 `@nextclaw/core` 代码与内置 skill，已执行以下最小充分验证：

- 定向测试：
  - `pnpm -C packages/nextclaw-core exec vitest run src/agent/context.test.ts`
- 定向构建：
  - `pnpm -C packages/nextclaw-core build`
- 可维护性检查：
  - `node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-core/src/agent/skills.ts packages/nextclaw-core/src/agent/skills/cross-channel-messaging/SKILL.md packages/nextclaw-core/src/agent/context.test.ts`

结果：

- 测试通过
- 构建通过
- maintainability guard 无阻塞项，仅提示 `packages/nextclaw-core/src/agent` 目录存在历史性的目录预算告警，本次未继续恶化

# 发布/部署方式

本次改动属于 `@nextclaw/core` 的运行时系统提示与 builtin skill 内容更新。

若需要对外生效，需随包含 `@nextclaw/core` 的新版本一起发布，并确保消费端使用新的 core 构建产物；本次仅完成本地修改与验证，未执行发布。

# 用户/产品视角的验收步骤

1. 启动包含本次改动的 NextClaw 版本。
2. 打开一个普通 UI/NCP 新会话，不手动选择任何 skill。
3. 直接对 AI 说：
   - `给我的微信发一条测试信息`
   - 或 `做完后通过微信通知我`
4. 观察模型是否能在可用 skill 清单里主动识别并加载 `cross-channel-messaging`，而不是忽略它。
5. 若系统上下文中已存在 `Known Weixin self-notify route`，观察模型是否直接调用 `message`，而不是再去问泛化的“user info”或误用其它渠道的用户查询工具。
6. 若只缺 Weixin `user_id`，观察模型是否只追问 `user_id@im.wechat` 这一最小必要字段。
