# NCP Tool Argument Contract Lightweight Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不新增合同层、不引入第二事实源的前提下，让 NCP runtime 严格执行现有 `tool.parameters`，并把工具失败稳定收敛在 tool level。

**Architecture:** 保持现有 `NcpTool` 接口和 `tool.parameters` 事实源不变，只在 runtime 内做两件事：第一，用 `Ajv` 替换手写轻量 schema validator，完整执行现有 JSON Schema 风格的 `parameters`；第二，在 `toolRegistry.execute()` 外收拢统一的 `try/catch`，把工具执行异常转成结构化 tool result。工具侧只补齐重点 schema，并删除已经被 schema 覆盖的重复参数兜底逻辑。

**Tech Stack:** TypeScript, Ajv, Vitest, NCP runtime/toolkit, NextClaw CLI runtime tools

---

### Task 1: 锁定轻量架构边界

**Files:**
- Read: `docs/rfcs/ncp-tool-argument-contract-v1.md`
- Read: `packages/ncp-packages/nextclaw-ncp-agent-runtime/src/utils.ts`
- Read: `packages/ncp-packages/nextclaw-ncp-agent-runtime/src/runtime.ts`
- Read: `packages/nextclaw-openclaw-compat/src/plugins/schema-validator.ts`

**Step 1: 明确 primary contract**

约束：
- `tool.parameters` 继续是唯一参数事实源
- 不新增 `ToolContract`
- 不新增专门合同包
- 不把 `zod` 引入为第二套工具参数 schema

**Step 2: 明确 runtime 职责**

runtime 只负责：
- parse raw args
- 用完整 JSON Schema validator 校验 `tool.parameters`
- 执行可选 `validateArgs`
- 在统一错误边界中调用 `toolRegistry.execute()`

**Step 3: 明确非目标**

非目标：
- 不重写整个 `NcpTool` 接口
- 不一次性重构所有工具
- 不引入 silent alias 兼容，如 `file_path -> path`

### Task 2: 用 Ajv 替换手写轻量 schema validator

**Files:**
- Modify: `packages/ncp-packages/nextclaw-ncp-agent-runtime/package.json`
- Modify: `packages/ncp-packages/nextclaw-ncp-agent-runtime/src/utils.ts`
- Create: `packages/ncp-packages/nextclaw-ncp-agent-runtime/src/utils.test.ts`
- Read: `packages/nextclaw-openclaw-compat/src/plugins/schema-validator.ts`

**Step 1: 增加 Ajv 依赖并复用现有思路**

变更：
- 在 `@nextclaw/ncp-agent-runtime` 中加入 `ajv`
- 参考 `packages/nextclaw-openclaw-compat/src/plugins/schema-validator.ts` 的缓存与错误格式化思路
- 不新建通用包，先在 runtime 包内落最小实现

**Step 2: 替换 `validateToolArgs`**

变更：
- 用 `Ajv` 编译并校验 `tool.parameters`
- 保持 `validateToolArgs(args, schema)` 这个调用入口不变，减少调用方变动
- 删除当前只支持 `type/required/enum/minimum/...` 的手写递归校验实现

**Step 3: 保持错误可读性**

要求：
- 返回 issue 列表
- issue 文案至少能指出字段路径和失败原因
- 对 `additionalProperties: false`、`oneOf`、`anyOf` 的报错要可调试，而不是只回“invalid”

**Step 4: 为 validator 补定向测试**

新增测试覆盖：
- `oneOf` 生效
- `additionalProperties: false` 生效
- required 生效
- unknown key 被拒绝

### Task 3: 在 runtime 收敛工具执行错误边界

**Files:**
- Modify: `packages/ncp-packages/nextclaw-ncp-agent-runtime/src/runtime.ts`
- Modify: `packages/ncp-packages/nextclaw-ncp-agent-runtime/src/utils.ts`
- Modify: `packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/in-memory-agent-backend.test.ts`

**Step 1: 为 execute 增加统一 try/catch**

变更：
- 在 `DefaultNcpAgentRuntime.runLoop()` 中包住 `this.toolRegistry.execute(...)`
- 当工具抛异常时，不向外抛出 run-level exception
- 直接构造结构化 tool-level error result，并继续当前 run loop

**Step 2: 增加统一错误 helper**

建议新增 helper：
- `createInvalidToolArgumentsResult(...)`
- `createToolExecutionFailedResult(...)`

要求：
- 两者都作为 `MessageToolCallResult` 输出
- 不把工具执行失败转成 `RunError`

**Step 3: 为 runtime 错误边界补测试**

新增/修改测试覆盖：
- schema 校验失败时，`toolRegistry.execute()` 不会被调用
- 工具执行抛异常时，会收到 `MessageToolCallResult`
- 工具执行抛异常时，不会升级成 `RunError`
- 对话仍能继续进入下一轮

### Task 4: 补齐重点工具 schema，并删除重复兜底

**Files:**
- Modify: `packages/nextclaw/src/cli/commands/ncp/runtime/ncp-asset-tools.ts`
- Create: `packages/nextclaw/src/cli/commands/ncp/runtime/ncp-asset-tools.test.ts`

**Step 1: 把 `asset_put.parameters` 写完整**

要求：
- 使用 `oneOf` 表达两种参数形态
- 补齐 `required`
- 增加 `additionalProperties: false`

**Step 2: 删除重复的基础参数兜底**

目标：
- 让 `execute()` 不再承担主参数合同校验
- 只保留真正属于业务执行阶段的异常

允许保留的内容：
- 文件不存在
- 写入失败
- asset store 抛出的真实业务错误

不应继续保留的内容：
- 基础字段缺失
- 字段名错误
- “要么 path，要么 bytesBase64 + fileName” 这类结构约束

**Step 3: 为 `asset_put` 补最小充分测试**

新增测试覆盖：
- `file_path` 被 schema 层拒绝
- `bytesBase64` 缺少 `fileName` 被 schema 层拒绝
- 合法 `path` 参数可正常执行

### Task 5: 校准其它高风险工具的 schema 书写方式

**Files:**
- Read: `packages/nextclaw/src/cli/commands/ncp/runtime/ncp-asset-tools.ts`
- Read: `packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-tool-registry.ts`
- Read: `packages/nextclaw-core/src/agent/tools/base.ts`

**Step 1: 形成 schema 书写最小规范**

至少明确三条：
- 能写 `required` 就写 `required`
- 能写 `additionalProperties: false` 默认就写
- `validateArgs` 只处理语义约束，不兜基础结构约束

**Step 2: 只挑高风险工具进入下一轮**

下一轮优先对象：
- 文件类工具
- exec 类工具
- session / spawn 类工具

本轮不要求一次性补齐所有工具，避免把问题从“过度设计”变成“过度施工”。

### Task 6: 验证与收尾

**Files:**
- Read: `packages/ncp-packages/nextclaw-ncp-agent-runtime/src/utils.test.ts`
- Read: `packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/in-memory-agent-backend.test.ts`
- Read: `packages/nextclaw/src/cli/commands/ncp/runtime/ncp-asset-tools.test.ts`

**Step 1: 运行最小充分测试**

建议命令：
- `pnpm -C packages/ncp-packages/nextclaw-ncp-agent-runtime test -- run src/utils.test.ts`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-toolkit test -- run src/agent/in-memory-agent-backend.test.ts`
- `pnpm -C packages/nextclaw test -- run src/cli/commands/ncp/runtime/ncp-asset-tools.test.ts`

**Step 2: 运行治理检查**

命令：
- `pnpm lint:maintainability:guard`

**Step 3: 收尾删减检查**

确认以下删除已经完成：
- 删除手写 JSON Schema 子集校验逻辑
- 删除 `asset_put.execute()` 中重复的基础参数兜底
- 未新增第二套合同层

**长期目标对齐 / 可维护性推进**

- 这次改动顺着“唯一事实源、行为更可预测、错误边界更清晰”的长期方向推进。
- 这次优先删减的是重复合同、重复兜底和错误升级链路，而不是新增更多架构层。
- 若最终出现少量代码净增长，其最小必要性仅限于 `Ajv` 接入和统一错误 helper；对应偿还的维护性债务是手写 validator 与 tool-level fatal 漏洞。
