# ADR: Chat 前端链路切换点

## 状态

Accepted for Phase 0

## 背景

NCP phase 1 采用“legacy 与 NCP 双链路并行、前端作为最终切换点”的策略。

为了保证：

- UI 保持一致
- 新旧链路可回滚
- 代码边界清晰

需要在 phase 0 先明确“前端切换点到底放在哪里”。

## 结论

本阶段前端切换点收敛为：

`packages/nextclaw-ui/src/components/chat/ChatPage.tsx` 的聊天主视图装配层。

更具体地说：

1. 路由入口仍保持在 [`packages/nextclaw-ui/src/App.tsx`](../../packages/nextclaw-ui/src/App.tsx) 的 `/chat/:sessionId?`。
2. `App.tsx` 不承担 legacy / ncp 具体编排选择，只负责进入 `ChatPage`。
3. `ChatPage` 在 `view === 'chat'` 的分支内承担聊天工作区装配职责，是 phase 1 的前端唯一切换点。
4. `ChatConversationPanel`、输入区容器、消息列表容器等更下层组件不直接承担链路选择职责。

## 为什么选这里

选择 `ChatPage` 聊天主视图装配层，而不是更上层或更下层，原因如下：

1. 它已经是聊天工作区的实际组装点，天然适合承载 legacy / ncp 分流。
2. `skills` / `cron` 等非聊天视图仍可保持不变，避免切换面扩大。
3. 再往上提到 `App.tsx` 会把链路判断扩散到整个应用路由层，过重。
4. 再往下沉到 `ChatConversationPanel` 或具体 container，会把切换逻辑污染到展示与局部容器层，过深。

## 约束

从本 ADR 生效起，前端切换必须遵守以下约束：

1. 链路选择只允许在聊天主视图装配层发生一次。
2. `@nextclaw/agent-chat-ui` 继续作为共享展示层基座，不参与链路判断。
3. legacy 与 NCP 允许各自拥有独立编排层，但都必须输出同一套展示契约。
4. 不允许在纯展示组件内部通过 `if/else` 混入双链路判断。
5. 若现有 `ChatPage` 无法承载该切换点，应先做最小装配层重构，再接入 NCP 分支。

## 后续影响

这项决策意味着：

1. 后续前端第一刀不是重写 UI，而是先把 `ChatPage` 的聊天工作区装配做成可插拔。
2. legacy 与 NCP 的主要差异留在 runtime / presenter / container 侧，而不是展示层。
3. 成功切换后，旧链路删除将主要发生在 legacy 编排层，而不是共享 UI 包。

## 关联文档

- [NCP 并行链路切换方案（Phase 1）](../plans/2026-03-17-ncp-parallel-chain-cutover-plan.md)
- [NCP Phase 0 能力冻结与切换基线](../plans/2026-03-17-ncp-phase0-capability-freeze.md)
