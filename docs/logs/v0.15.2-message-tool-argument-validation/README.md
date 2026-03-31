# v0.15.2-message-tool-argument-validation

## 迭代完成说明

- 将 `message` 工具的关键缺参校验从“主要靠 `execute()` 内手写字符串报错”升级为“统一参数校验链路 + 结构化 invalid args 反馈”。
- 在 `@nextclaw/ncp` 的 tool 接口上补充可选 `validateArgs` 能力，让 runtime 在 schema 校验通过后还能执行工具自定义语义校验。
- `message` 工具现在会统一校验：
  - `content` / `message` 至少有一个非空
  - 当目标 `channel` 与当前会话不同且未显式提供 `to` / `chatId` 时，直接判为无效参数
- `@nextclaw/ncp-agent-runtime` 现在会优先输出结构化 `invalid_tool_arguments`，而不是把这类问题留到工具执行阶段才返回普通字符串错误。
- 补充测试：
  - `message` 工具本地参数校验测试
  - NCP backend 针对“工具自定义语义校验”产出结构化 invalid args 的回归测试
- 为满足仓库治理规则，本次同步把运行时中被触达类的方法声明收敛到当前项目允许的写法，不改变功能语义。

## 测试/验证/验收方式

- 运行：
  - `pnpm --filter @nextclaw/core exec vitest run src/agent/tools/message.test.ts`
  - `pnpm --filter @nextclaw/ncp-toolkit exec vitest run src/agent/in-memory-agent-backend.test.ts`
  - `pnpm --filter @nextclaw/ncp build`
  - `pnpm --filter @nextclaw/ncp-agent-runtime build`
  - `pnpm --filter @nextclaw/core build`
  - `pnpm lint:new-code:governance`
  - `node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-core/src/agent/tools/base.ts packages/nextclaw-core/src/agent/tools/message.ts packages/nextclaw-core/src/extensions/tool-adapter.ts packages/ncp-packages/nextclaw-ncp/src/agent-runtime/tool.ts packages/ncp-packages/nextclaw-ncp-agent-runtime/src/runtime.ts packages/ncp-packages/nextclaw-ncp-toolkit/src/agent/in-memory-agent-backend.test.ts`
- 观察点：
  - `message` 缺 `content/message` 时不再继续发送
  - 跨 channel 且缺 `to/chatId` 时，runtime 返回结构化 `invalid_tool_arguments`
  - 非法参数场景下真实工具执行次数应为 `0`
  - 语义校验失败后，原始参数文本仍会进入下一轮上下文

## 发布/部署方式

- 本次涉及：
  - `@nextclaw/core`
  - `@nextclaw/ncp`
  - `@nextclaw/ncp-agent-runtime`
  - `@nextclaw/ncp-toolkit`
- 本地 workspace 重新构建以上包后即可生效。
- 如需正式发布，按既有 NCP / core 联动发布流程一并发版。

## 用户/产品视角的验收步骤

- 让模型调用 `message` 工具但故意不传 `content/message`，确认不会真的发消息。
- 让模型从当前会话向另一个 `channel` 发送消息，但不传 `to/chatId`，确认 UI / tool result 中看到的是结构化 invalid args，而不是误导性的“发送失败”普通字符串。
- 让模型修正参数后再次调用，确认工具可以正常执行并成功发出消息。
