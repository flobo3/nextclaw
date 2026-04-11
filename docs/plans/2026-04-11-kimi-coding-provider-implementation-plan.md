# Kimi Coding Provider Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 NextClaw 中新增可实际运行的 `kimi-coding` 专用 provider，让 Kimi Coding 不再被当作普通 OpenAI custom provider 接入。

**Architecture:** 保持现有 `ProviderManager -> LiteLLMProvider` 入口不变，但给 provider spec 增加显式协议字段，并在 core 内新增一个轻量的 `AnthropicMessagesProvider`。`kimi-coding` 作为 builtin provider 走 `anthropic-messages` 协议和专用默认 header，避免把 Kimi Coding 错接到 OpenAI chat/responses 探针。同时顺手修正 custom provider 在前端无法正确保存/测试 `wireApi` 的不一致问题。

**Tech Stack:** TypeScript, Vitest, fetch/undici, NextClaw core/runtime/server/ui

---

### Task 1: 锁定 provider 协议边界

**Files:**
- Modify: `packages/nextclaw-core/src/providers/types.ts`
- Modify: `packages/nextclaw-core/src/providers/litellm_provider.ts`

**Step 1: 给 ProviderSpec 增加显式协议字段**

约束：
- 不再依赖 provider 名称硬编码猜测上游协议
- 默认仍保持 OpenAI-compatible
- 只为确有必要的 provider 显式声明非默认协议

**Step 2: 让 LiteLLMProvider 基于 spec 选择真实 client**

实现要点：
- 保持 `LiteLLMProvider` 作为统一入口 class，不额外引入新的 provider manager 分支
- 当 builtin spec 声明 `anthropic-messages` 时，内部 client 改为新的 `AnthropicMessagesProvider`
- 其他 provider 继续沿用 `OpenAICompatibleProvider`

### Task 2: 在 core 新增 Anthropic Messages provider

**Files:**
- Create: `packages/nextclaw-core/src/providers/anthropic/anthropic-messages.provider.ts`
- Create: `packages/nextclaw-core/src/providers/anthropic/anthropic-messages.provider.test.ts`
- Modify: `packages/nextclaw-core/src/index.ts`

**Step 1: 实现最小可用的消息协议转换**

实现范围：
- 支持把现有内部消息格式转换成 Anthropic `system/messages/tools`
- 支持 assistant 文本和 `tool_use` 结果映射回 `LLMResponse`
- 支持 `extraHeaders`
- 默认补齐 Kimi Coding 所需的 Anthropic header

非目标：
- 不做复杂流式增量协议；本次先用 `chat()` 打通可靠链路，`chatStream()` 可退化为 base class 默认 done 事件
- 不引入新的第三方 SDK 依赖

**Step 2: 为协议转换和 header 行为补测试**

测试覆盖：
- 普通文本对话
- tool schema / tool call 映射
- Kimi 默认 header 与用户自定义 header 合并行为

### Task 3: 注册 builtin `kimi-coding` provider

**Files:**
- Create: `packages/nextclaw-runtime/src/providers/plugins/kimi-coding.provider.ts`
- Modify: `packages/nextclaw-runtime/src/providers/plugins/builtin.ts`
- Modify: `packages/nextclaw-server/src/ui/config.ts`
- Modify: `packages/nextclaw-server/src/ui/router.provider-test.test.ts`
- Modify: `packages/nextclaw-core/src/config/schema.provider-routing.test.ts`

**Step 1: 新增 provider spec**

实现要点：
- provider 名称：`kimi-coding`
- 默认 base：`https://api.kimi.com/coding`
- 默认模型：面向 Kimi coding 的 builtin route
- 协议：`anthropic-messages`
- 默认 header：`User-Agent: claude-code/0.1.0`
- 在 UI provider 排序中显式列出

**Step 2: 补 provider 路由与 UI meta 测试**

测试覆盖：
- builtin provider meta 暴露 `kimi-coding`
- provider 路由可解析 `kimi-coding/...`
- 测试连接走到正确 provider

### Task 4: 修正 custom provider 的 wireApi 前端不一致

**Files:**
- Modify: `packages/nextclaw-ui/src/components/config/ProviderForm.tsx`

**Step 1: 统一 supportsWireApi 判定**

实现要点：
- custom provider 与 builtin provider 使用同一套“是否支持 wireApi”判定
- 修正保存、变更检测、测试连接三处逻辑
- 不扩展新的 UI 字段，只修正现有行为不一致

### Task 5: 验证与收尾

**Files:**
- Read: `packages/nextclaw-core/src/providers/anthropic/anthropic-messages.provider.test.ts`
- Read: `packages/nextclaw-core/src/config/schema.provider-routing.test.ts`
- Read: `packages/nextclaw-server/src/ui/router.provider-test.test.ts`

**Step 1: 运行最小充分测试**

建议命令：
- `pnpm -C packages/nextclaw-core test -- run src/providers/anthropic/anthropic-messages.provider.test.ts src/providers/litellm_provider.test.ts src/config/schema.provider-routing.test.ts`
- `pnpm -C packages/nextclaw-server test -- run src/ui/router.provider-test.test.ts`
- `pnpm -C packages/nextclaw-ui test -- --run`（若当前包有可直接运行的测试入口）

**Step 2: 运行受影响构建/类型/治理检查**

建议命令：
- `pnpm -C packages/nextclaw-core tsc`
- `pnpm -C packages/nextclaw-runtime tsc`
- `pnpm -C packages/nextclaw-server tsc`
- `pnpm -C packages/nextclaw-ui tsc`
- `pnpm lint:maintainability:guard`

**Step 3: 迭代留痕**

本次触达代码，收尾时必须按 `docs/logs` 规则判断是否并入最近相关迭代，或创建新的更高版本迭代目录。

**长期目标对齐 / 可维护性推进**

- 这次改动是把“coding agent 专用入口”收敛成一个清晰 provider，而不是继续让用户在 custom provider 里猜协议和 header，符合 NextClaw 的“统一体验优先、意图优先”目标。
- 优先删减的是错误接入路径和隐式猜测，而不是再叠一层兼容补丁。
- 若出现净增长，其最小必要性在于补齐缺失的协议 owner class；同时偿还的维护性债务是 custom provider / builtin provider 协议边界混乱和 UI 行为不一致。
