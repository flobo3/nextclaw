# v0.13.160-ncp-phase0-cutover-freeze

## 迭代完成说明（改了什么）

- 新增 [`docs/plans/2026-03-17-ncp-phase0-capability-freeze.md`](../../../docs/plans/2026-03-17-ncp-phase0-capability-freeze.md)，完成 NCP cutover `Phase 0` 的能力冻结与切换基线定义：
  - 固化 legacy 主链路基线能力
  - 固化 NCP phase 1 目标能力与非目标
  - 定义切换前判定标准
- 新增 [`docs/designs/2026-03-17-chat-frontend-chain-switch-adr.md`](../../../docs/designs/2026-03-17-chat-frontend-chain-switch-adr.md)，明确前端切换点落在 `ChatPage` 的聊天主视图装配层，而不是全局路由层或更深的展示层。
- 更新 [`docs/plans/2026-03-17-ncp-parallel-chain-cutover-plan.md`](../../../docs/plans/2026-03-17-ncp-parallel-chain-cutover-plan.md)，将 `Phase 0` 的两份交付物文档正式挂回主方案。

## 测试/验证/验收方式

- 文档结构检查：
  - 确认 `Phase 0` 两份交付物文档存在且可读
  - 确认主方案文档已引用这两份文档
- 代码路径核对：
  - 基于当前实现确认聊天路由入口仍为 `packages/nextclaw-ui/src/App.tsx` 的 `/chat/:sessionId?`
  - 基于当前实现确认聊天主视图装配点位于 `packages/nextclaw-ui/src/components/chat/ChatPage.tsx`
- `build/lint/tsc`：不适用。本次仅触达文档与方案冻结，不修改运行代码路径。

## 发布/部署方式

- 本次为文档与架构冻结迭代，无需发布、部署或 migration。
- 后续代码实施阶段按对应影响范围执行最小充分验证与发布闭环。

## 用户/产品视角的验收步骤

1. 打开 [`docs/plans/2026-03-17-ncp-parallel-chain-cutover-plan.md`](../../../docs/plans/2026-03-17-ncp-parallel-chain-cutover-plan.md)，确认 `Phase 0` 已不再只是占位，而是有明确交付物链接。
2. 打开 [`docs/plans/2026-03-17-ncp-phase0-capability-freeze.md`](../../../docs/plans/2026-03-17-ncp-phase0-capability-freeze.md)，确认 legacy 基线能力、NCP phase 1 目标能力、非目标、切换前判定标准均已冻结。
3. 打开 [`docs/designs/2026-03-17-chat-frontend-chain-switch-adr.md`](../../../docs/designs/2026-03-17-chat-frontend-chain-switch-adr.md)，确认前端切换点已明确到现有代码中的 `ChatPage` 聊天主视图装配层。
4. 评审结论应能直接回答三个问题：
   - phase 1 切换前必须达到哪些能力
   - 前端切换点具体落在哪里
   - 后续第一刀代码实施应从哪个装配层开始
