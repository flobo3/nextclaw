# v0.15.8-chat-tool-auto-expand-delay

## 迭代完成说明

- 聊天前端的工具卡片新增“延迟自动展开”机制：运行中的工具不会立刻展开，而是先等待一个很短的显式阈值；如果工具在阈值内就完成，则保持折叠，避免瞬间展开又收起的闪烁。
- 修正 `exec_command` 工具卡片分类错误，确保这类命令执行走终端卡片视图，而不是误落到 generic 卡片。
- 恢复 generic 工具卡片在运行态的可展开能力，避免分类漏网时出现“工具明明还在跑，但几秒后仍然不展开”的回归。
- 为聊天 UI 补充两个回归测试：
  - 长耗时 `exec_command` 会在短延迟后自动展开。
  - 快速完成的 `exec_command` 不会闪一下再收起。

## 测试 / 验证 / 验收方式

- 已执行：`PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui test -- chat-message-list.test.tsx`
  - 结果：`1 passed, 17 passed`
- 已执行：`PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui lint`
  - 结果：通过；仅存在该包既有 warning，无新增 error
- 已执行：`PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui tsc`
  - 结果：通过
- 已执行：`PATH=/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard`
  - 结果：本次聊天 UI 相关文件未报新增 error，但命令最终失败于工作区内既有脏改动 `packages/nextclaw-core/src/agent/tools/shell.ts` / `shell.test.ts` 触发的治理守卫，不属于本次修复引入的问题

## 发布 / 部署方式

- 本次仅为前端聊天 UI 行为修复，当前未执行发布。
- 若需要发布前端包，按项目既有前端发布流程执行对应 release 闭环；本迭代本身不包含版本发布动作。

## 用户 / 产品视角的验收步骤

1. 在聊天界面触发一个极快完成的工具调用，例如很短的 `exec_command`。
2. 观察工具卡片：不应出现“展开一下立刻又收起”的闪烁。
3. 再触发一个会持续数秒的工具调用。
4. 观察工具卡片：应在短延迟后自动展开，并持续展示运行中的内容；完成后若未手动干预，应自动回到折叠态。
5. 手动点击展开中的工具卡片，再等待完成，确认手动展开/收起语义仍然保持可控，没有被自动逻辑抢走。
