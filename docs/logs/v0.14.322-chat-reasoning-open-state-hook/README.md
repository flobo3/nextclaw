# v0.14.322-chat-reasoning-open-state-hook

## 迭代完成说明

- 将 chat reasoning block 中“进行中展开、完成后自动收起、尊重用户手动展开”的本地状态机抽离为独立 hook。
- 新增 `useReasoningBlockOpenState`，统一封装 reasoning 展开态与 summary 点击行为。
- `ChatReasoningBlock` 收敛为纯展示组件，降低组件内状态逻辑密度，方便后续复用与单独演进。
- 保持上一轮 reasoning queue 展开/收起交互语义不变。

## 测试/验证/验收方式

- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui test -- chat-message-list.test.tsx`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui tsc`
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui lint`
  - 结果：通过，存在仓库内既有 warning，不属于本次 hook 拆分新增错误。
- `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm lint:maintainability:guard`
  - 结果：通过。

## 发布/部署方式

- 本次为前端内部结构整理，无需远程 migration。
- 若随版本发布，按既有前端 package 发布流程执行构建、版本提升与发布即可。

## 用户/产品视角的验收步骤

1. 打开聊天界面并触发包含 reasoning 的 assistant 回复。
2. 确认当前仍在输出的 reasoning queue 默认展开。
3. 确认 reasoning queue 完成后自动收起。
4. 在 reasoning 进行中手动重新展开后，确认完成时不再被自动收起。
5. 确认本次重构后上述交互表现与上一轮功能修复一致，没有回归。
