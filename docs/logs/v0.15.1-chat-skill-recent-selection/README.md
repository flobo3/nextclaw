# v0.15.1-chat-skill-recent-selection

## 迭代完成说明

- 为聊天输入区的 skill 选择补齐“最近使用优先”能力，覆盖两条入口：
  - 输入 `/` 触发的 slash skill 菜单
  - 底部工具栏里的 skill picker
- 新增本地 recent skill 记录器：`packages/nextclaw-ui/src/components/chat/chat-recent-skills.manager.ts`
- 统一把 recent skill 排序收敛到 chat input 适配层：
  - slash 菜单在空 `/` 状态下直接 recent 优先；有搜索词时按“匹配层级优先、同层 recent 优先”排序
  - 底部 skill picker 会把最近使用的 skill 提前，并在技能数量足够时显示“最近使用 / 全部技能”分组
- 仅在用户显式选择 skill 时记录 recent：
  - 底部 picker 勾选 skill
  - slash 菜单点击插入 skill
  - 避免把恢复草稿或被动状态同步误记成最近使用
- 补齐相关类型、回调链路与测试，保持模型 recent 和 skill recent 的实现风格一致

## 测试/验证/验收方式

- 适配层单测：

```bash
PATH=/opt/homebrew/bin:/usr/local/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH \
pnpm --filter @nextclaw/ui exec vitest run src/components/chat/adapters/chat-input-bar.adapter.test.ts
```

- 结果：`Test Files 1 passed`，`Tests 11 passed`

- Chat input UI 单测：

```bash
PATH=/opt/homebrew/bin:/usr/local/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH \
pnpm --filter @nextclaw/agent-chat-ui exec vitest run src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx
```

- 结果：`Test Files 1 passed`，`Tests 11 passed`

- 类型检查：

```bash
PATH=/opt/homebrew/bin:/usr/local/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/ui tsc
PATH=/opt/homebrew/bin:/usr/local/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui tsc
```

- 结果：两侧 `tsc` 均通过

- 可维护性守卫：

```bash
PATH=/opt/homebrew/bin:/usr/local/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm lint:maintainability:guard
```

- 结果：
  - 阻塞项为 `0`
  - 警告 `3` 条，分别是两个历史目录预算警告，以及 `chat-input-bar.adapter.ts` 接近文件预算上限
  - 治理检查已通过

## 发布/部署方式

- 本次为前端交互优化，不涉及后端、数据库或单独发布链路变更。
- 若需要把本次改动随前端一并发布，沿用现有前端发布流程即可；本次未执行独立发布。
- 远程 migration：不适用（未触达后端/数据库）

## 用户/产品视角的验收步骤

1. 进入聊天页，先用底部 skill picker 依次选择几个常用 skill。
2. 重新打开 skill picker，确认最近选过的 skill 会排在最前；当可选 skill 数量较多时，可看到“最近使用”分组。
3. 在输入框里输入 `/`，确认 slash skill 菜单里最近使用过的 skill 会优先出现。
4. 在 `/we`、`/doc` 这类搜索状态下，确认 slash 菜单仍按匹配相关性排序，但同一匹配层级内最近使用的 skill 会更靠前。
5. 再切换选择另一个 skill，重复打开 picker 和 slash 菜单，确认 recent 顺序会更新，最新一次选择的 skill 会被提前。
6. 普通输入、发送消息、附件插入、模型选择与 thinking 选择行为应保持原样，不受本次改动影响。
