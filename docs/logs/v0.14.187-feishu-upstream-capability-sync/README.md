# v0.14.187-feishu-upstream-capability-sync

## 迭代完成说明

- 完成飞书插件对上游高价值能力面的同步落地，补齐 `calendar / task / sheets / identity / oauth`，并接入“以本人身份执行”的 OAuth + ticket + user tool client 链路。
- 在飞书消息上下文中透传 `accountId / senderOpenId / chatId / messageId`，让日历、任务、表格、身份查询与授权工具都能按当前发消息的人身份执行。
- 调整飞书工具注册策略，只要任一启用账号打开能力就注册对应工具，避免多账号场景被首账号配置误伤。
- 收口 `sheets.ts` 的可维护性拆分、修复 `task-tasklist.ts` schema 语法问题、修正 `calendar-shared.ts` 的类型导入。
- 完成版本联动发布并同步 changelog：
  - `@nextclaw/channel-plugin-feishu@0.2.19`
  - `@nextclaw/openclaw-compat@0.3.26`
  - `@nextclaw/mcp@0.1.40`
  - `@nextclaw/server@0.10.44`
  - `@nextclaw/remote@0.1.38`
  - `@nextclaw/ncp-mcp@0.1.39`
  - `nextclaw@0.15.2`
- 相关方案与能力清单：
  - [实施方案](../../plans/2026-03-25-feishu-upstream-sync-implementation-plan.md)
  - [能力同步清单](../../plans/2026-03-25-feishu-upstream-capability-sync-checklist.md)

## 测试/验证/验收方式

- 定向 lint：
  - `PATH=/opt/homebrew/bin:$PATH pnpm exec eslint $(git show --name-only --format='' e2c6cc00 -- packages/extensions/nextclaw-channel-plugin-feishu | rg '\.ts$')`
  - 结果：本次飞书能力同步文件 `0 error`，仅保留复杂度类 warning。
- 新增测试：
  - `PATH=/opt/homebrew/bin:$PATH packages/nextclaw-openclaw-compat/node_modules/.bin/vitest run packages/extensions/nextclaw-channel-plugin-feishu/src/tools-config.test.ts packages/extensions/nextclaw-channel-plugin-feishu/src/tool-account-routing.test.ts`
  - 结果：`2 files / 9 tests passed`。
- 插件装载冒烟：
  - 使用 `tsx` 直接导入 `packages/extensions/nextclaw-channel-plugin-feishu/index.ts`，以最小多账号配置执行 `plugin.register(api)`。
  - 结果：成功注册 13 个工具，并确认以下关键新增工具存在：
    - `feishu_calendar_calendar`
    - `feishu_calendar_event`
    - `feishu_calendar_event_attendee`
    - `feishu_calendar_freebusy`
    - `feishu_task_tasklist`
    - `feishu_task_task`
    - `feishu_task_comment`
    - `feishu_task_subtask`
    - `feishu_sheet`
    - `feishu_oauth`
    - `feishu_get_user`
    - `feishu_search_user`
- 全仓发布前校验：
  - `PATH=/opt/homebrew/bin:$PATH pnpm release:publish`
  - 结果：`build / lint / tsc / changeset publish / changeset tag` 全部跑通并完成 npm 发布。
- maintainability guard：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/extensions/nextclaw-channel-plugin-feishu/src/calendar-shared.ts packages/extensions/nextclaw-channel-plugin-feishu/src/sheets.ts packages/extensions/nextclaw-channel-plugin-feishu/src/sheets-shared.ts packages/extensions/nextclaw-channel-plugin-feishu/src/task-tasklist.ts`
  - 结果：`Errors: 0 / Warnings: 0`。

## 发布/部署方式

- 标准版本化：
  - `PATH=/opt/homebrew/bin:$PATH pnpm release:version`
- 标准发布：
  - `PATH=/opt/homebrew/bin:$PATH pnpm release:publish`
- 本次实际已完成 npm 发布与 tag：
  - `@nextclaw/channel-plugin-feishu@0.2.19`
  - `@nextclaw/openclaw-compat@0.3.26`
  - `@nextclaw/mcp@0.1.40`
  - `@nextclaw/server@0.10.44`
  - `@nextclaw/remote@0.1.38`
  - `@nextclaw/ncp-mcp@0.1.39`
  - `nextclaw@0.15.2`

## 用户/产品视角的验收步骤

1. 安装或升级到本次发布后的 `nextclaw@0.15.2`，并确保内置飞书插件版本为 `@nextclaw/channel-plugin-feishu@0.2.19`。
2. 在飞书渠道配置中启用目标账号，并打开 `tools.calendar / tools.task / tools.sheets / tools.oauth / tools.identity`。
3. 在飞书里给机器人发消息，先调用 `feishu_oauth` 执行 `authorize`，完成当前发送者账号授权。
4. 继续在同一会话中验证以下工具都以当前发送者身份工作：
   - `feishu_calendar_calendar` / `feishu_calendar_event`
   - `feishu_task_tasklist` / `feishu_task_task`
   - `feishu_sheet`
   - `feishu_get_user` / `feishu_search_user`
5. 切换到另一个飞书用户重复 `authorize -> status -> 业务工具调用`，确认不同发送者不会串用令牌，且多账号下工具仍会按启用能力正常注册。
