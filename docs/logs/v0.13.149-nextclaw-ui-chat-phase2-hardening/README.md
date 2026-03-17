# v0.13.149-nextclaw-ui-chat-phase2-hardening

## 迭代完成说明（改了什么）
- 在 `packages/nextclaw-ui/src/components/chat` 完成第二阶段硬化收敛，核心目标是降低 host 泄漏并稳定可拆包边界。
- 输入区（InputBar）
  - `chat-ui.types.ts` 移除 `ReactNode[]`、`MutableRefObject` 等宿主类型泄漏。
  - `chat-input-bar.adapter.ts` 改为本地 UI adapter 类型（`ChatSkillRecord`/`ChatModelRecord`/`ChatThinkingLevel`），不再直接耦合业务类型。
  - `chat-input-bar.container.tsx` 只在容器层做业务映射，UI 组件只消费 view-model。
  - 新增 `chat-input-bar-skill-picker.tsx`，以通用 `skillPicker` contract 驱动，替换旧 `SkillsPicker` 业务耦合路径。
  - `chat-slash-menu.tsx` 内聚 anchor/list/宽度与滚动行为，不再把 ref/布局细节暴露到外部 contract。
- 消息区（MessageList）
  - `chat-message.adapter.ts` 改为 `ChatMessageSource -> ChatMessageViewModel`，并补齐 `unknown` part 显式兜底渲染。
  - 新增 `chat-unknown-part.tsx` 并接入 `chat-message.tsx`。
  - `chat-message-list.container.tsx` 在容器层完成 runtime message 到 UI source 的适配。
- 统一 primitive 适配层
  - 新增 `ui/primitives/chat-ui-primitives.tsx`，集中托管 select/popover/tooltip 适配，降低上层对具体 UI 实现细节的耦合。
- 出口与边界
  - 新增 `components/chat/index.ts` 作为 chat 模块统一导出边界。

## 测试/验证/验收方式
- 类型检查：
  - `pnpm -C packages/nextclaw-ui tsc`
- 单元/组件测试：
  - `pnpm -C packages/nextclaw-ui test`
- 构建验证：
  - `pnpm -C packages/nextclaw-ui build`
- 代码规范（改动相关范围）：
  - `pnpm -C packages/nextclaw-ui exec eslint src/components/chat src/lib/i18n.ts`

## 发布/部署方式
- 本迭代为 `nextclaw-ui` 内部重构硬化，不涉及独立包拆分与协议变更。
- 按常规前端发布流程跟随主分支发布节奏即可；无需额外 migration。

## 用户/产品视角的验收步骤
1. 打开 Chat 页面，确认欢迎态/空态展示正常。
2. 在输入框输入 `/`，验证 slash 列表的过滤、上下键导航、回车选择、`Esc` 关闭。
3. 选择 skill 后确认已选 chips 展示与删除交互正常。
4. 验证发送/停止按钮在 `isSending`、`canStopGeneration` 状态切换时行为正确。
5. 发送包含 markdown/code/tool/reasoning 的消息，确认 MessageList 渲染不回归。
6. 触发未知消息 part（或使用测试数据），确认 UI 显示可见 fallback，而不是静默丢失。
