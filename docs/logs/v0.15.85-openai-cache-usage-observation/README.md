# v0.15.85-openai-cache-usage-observation

## 迭代完成说明

本次围绕 “prompt cache usage 先做观测，不先做策略” 继续收尾，最终交付了三层能力：

1. provider 层把上游返回的 cache usage 数字标准化保留下来；
2. NextClaw CLI 增加了独立的 `nextclaw usage` 命令，让 AI 和用户都能直接查最近一次 usage 快照；
3. 在不引入统一日志模块的前提下，CLI 侧补了一层轻量本地 history / stats 查询，AI 能直接通过命令自查最近 usage 记录和聚合统计。

本批次实际改动包括：

- 在 [packages/nextclaw-core/src/providers/chat-completions-normalizer.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/providers/chat-completions-normalizer.ts) 新增共享 usage 标准化逻辑，把嵌套 usage detail 中的数值字段拍平成稳定键名，例如 `prompt_tokens_details.cached_tokens -> prompt_tokens_details_cached_tokens`、`input_tokens_details.cached_tokens -> input_tokens_details_cached_tokens`。
- 在 [packages/nextclaw-core/src/providers/openai_provider.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/providers/openai_provider.ts) 复用同一逻辑，覆盖 `responses` API 的普通响应和流式 usage merge。
- 在 [packages/nextclaw/src/cli/runtime-state/llm-usage-snapshot.store.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/runtime-state/llm-usage-snapshot.store.ts) 新增独立快照 store，把最近一次 LLM usage 记录到 `${NEXTCLAW_HOME:-~/.nextclaw}/run/llm-usage.json`。
- 在 [packages/nextclaw/src/cli/runtime-state/llm-usage-history.store.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/runtime-state/llm-usage-history.store.ts) 新增本地 history store，把 usage 记录追加写入 `${NEXTCLAW_HOME:-~/.nextclaw}/logs/llm-usage.jsonl`，先满足“命令行可查”和“后续 UI 可复用”的轻量需求。
- 在 [packages/nextclaw/src/cli/commands/shared/llm-usage-recorder.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/shared/llm-usage-recorder.ts) 新增 recorder class，把“生成 usage record + 写最近快照 + 追加 history”收敛在一个 owner 内，避免 observer 直接操心多个落点。
- 在 [packages/nextclaw/src/cli/commands/shared/llm-usage-query.service.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/shared/llm-usage-query.service.ts) 新增查询/聚合 service，集中负责 history 读取、limit 处理和 stats 聚合。
- 在 [packages/nextclaw/src/cli/commands/shared/llm-usage-observer.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/shared/llm-usage-observer.ts) 继续使用 provider manager 观察器，以装饰器方式接入 CLI agent 与本地 UI/NCP 运行链路，但写入职责已经下沉到 recorder，不再把多落点逻辑硬塞在 observer 里。
- 在 [packages/nextclaw/src/cli/index.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/index.ts) 新增 `nextclaw usage` 命令入口。
- 在 [docs/USAGE.md](/Users/peiwang/Projects/nextbot/docs/USAGE.md) 与 [packages/nextclaw/resources/USAGE.md](/Users/peiwang/Projects/nextbot/packages/nextclaw/resources/USAGE.md) 补 usage 命令文档，让 NextClaw AI 能从内置 guide 自己学会查询。
- 在 [docs/TODO.md](/Users/peiwang/Projects/nextbot/docs/TODO.md) 明确保留下一步待办：当前只是轻量 CLI history / stats，后续仍需要升级为统一的 usage/logging 事件模块。

相关设计文档：

- [docs/plans/2026-04-11-usage-history-cli-design.md](/Users/peiwang/Projects/nextbot/docs/plans/2026-04-11-usage-history-cli-design.md)

结果是：

- 只要上游 provider 返回 cache usage 数字，NextClaw 现在能把它保留下来；
- 本地 CLI 和本地 UI/NCP 运行过后，`nextclaw usage` 不仅能查最近一次 usage，还能通过 `--history` 和 `--stats` 查看轻量 history / 统计；
- AI 读取 `USAGE.md` 后，也知道应该用 `nextclaw usage --json`、`nextclaw usage --history --json` 或 `nextclaw usage --stats --json` 来看 prompt cache 观测结果。

## 测试/验证/验收方式

已执行：

- `pnpm -C packages/nextclaw-core exec vitest run src/providers/chat-completions-normalizer.test.ts src/providers/openai_provider.test.ts`
- `pnpm -C packages/nextclaw exec vitest run src/cli/commands/shared/llm-usage.commands.test.ts src/cli/commands/shared/llm-usage-observer.test.ts`
- `NEXTCLAW_HOME="$(mktemp -d)" pnpm -C packages/nextclaw exec tsx src/cli/index.ts usage --history`
- `NEXTCLAW_HOME="$(mktemp -d)" pnpm -C packages/nextclaw exec tsx src/cli/index.ts usage --stats`
- `pnpm -C packages/nextclaw tsc`
- `pnpm -C packages/nextclaw exec eslint src/cli/commands/shared/llm-usage.commands.ts src/cli/commands/shared/llm-usage-observer.ts src/cli/commands/shared/llm-usage-recorder.ts src/cli/commands/shared/llm-usage-query.service.ts src/cli/commands/shared/llm-usage.commands.test.ts src/cli/commands/shared/llm-usage-observer.test.ts src/cli/runtime-state/llm-usage-record.ts src/cli/runtime-state/llm-usage-history.store.ts src/cli/runtime-state/llm-usage-snapshot.store.ts src/cli/index.ts src/cli/runtime.ts src/cli/commands/ncp/create-ui-ncp-agent.ts`
- `pnpm -C packages/nextclaw-core exec eslint src/providers/openai_provider.ts src/providers/openai_provider.test.ts src/providers/chat-completions-normalizer.ts src/providers/chat-completions-normalizer.test.ts`
- `NEXTCLAW_HOME="$(mktemp -d)" pnpm -C packages/nextclaw exec tsx src/cli/index.ts usage --json`
- 手动写入一个临时 `llm-usage.json` 后执行 `pnpm -C packages/nextclaw exec tsx src/cli/index.ts usage`
- `node packages/nextclaw/scripts/sync-usage-resource.mjs`
- `pnpm lint:maintainability:guard`

验证结果：

- provider 相关 `vitest` 通过，2 个测试文件共 12 条测试全部通过。
- CLI usage 相关 `vitest` 通过，2 个测试文件共 6 条测试全部通过。
- 本次改动相关 ESLint 无 error，仅保留已有大文件上的 warning。
- `nextclaw usage --json` 冒烟通过；无快照时会返回 `ok: false` 和快照路径。
- 人工写入快照与 history 后再执行 `nextclaw usage` / `nextclaw usage --history` / `nextclaw usage --stats` 冒烟通过；会正确显示 `Cached tokens`、`Cache hit`、最近记录与聚合统计。
- `pnpm -C packages/nextclaw tsc` 未通过，但失败点是仓库里已有的无关类型错误：[installed.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw-server/src/ui/ui-routes/marketplace/installed.ts) 中 `Set<string | undefined>` 赋给 `Set<string>`，不是本次 usage 改动引入。
- `pnpm lint:maintainability:guard` 未通过。当前阻断主要有两类：
  - 与本次直接相关： [openai_provider.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/providers/openai_provider.ts) 作为历史超大文件，虽然这次为了满足 class-arrow 规则做了机械式调整，但文件内部复杂度债务依旧较重；
  - 与本次无关：`apps/desktop/src` 目录预算在工作区其他改动下越线。

## 发布/部署方式

本次改动涉及 `@nextclaw/core` 与 `nextclaw` CLI 包。

- 无需数据库迁移。
- 无需远程平台特殊部署。
- 正常随 `@nextclaw/core` 和 `nextclaw` 的发布流程带出即可。
- 若只做本地验证，可先跑任意一次 CLI agent 或本地 UI/NCP 请求，再执行 `nextclaw usage` 查看最近 usage。

## 用户/产品视角的验收步骤

1. 运行一次会触发 LLM 请求的路径：
   - CLI：`nextclaw agent -m "ping"`
   - 或本地 UI/NCP 对话
2. 执行 `nextclaw usage`。
3. 确认命令能显示最近一次 usage 快照，包括：
   - `Prompt tokens`
   - `Completion tokens`
   - `Total tokens`
   - `Cached tokens`
   - `Cache hit`
4. 执行 `nextclaw usage --history`，确认能看到最近 usage 记录列表，且包含 `source`、`model`、`total`、`cached`。
5. 执行 `nextclaw usage --stats`，确认能看到累计 `Records`、`Cached tokens`、`Cache hits` 等统计信息。
6. 若需要机器可读结果，执行 `nextclaw usage --json`、`nextclaw usage --history --json` 或 `nextclaw usage --stats --json`。
7. 若 provider 返回了 cache usage detail，确认输出中存在类似 `prompt_tokens_details_cached_tokens` 或 `input_tokens_details_cached_tokens` 的字段。

## 可维护性总结汇总

### 长期目标对齐 / 可维护性推进

这次不是把“观测”硬塞进已有诊断命令或 agent 主流程，而是拆成了独立 record factory、独立 recorder、独立 snapshot/history store、独立 query service、独立 usage command 几层，方向上是更模块化、更可插拔的。对 NextClaw 这种统一入口产品来说，这比在各处散落 `console.log(usage)` 更符合长期治理。

### 可维护性复核结论

保留债务经说明接受。

### 本次顺手减债

是。

- provider usage 拍平逻辑收敛为共享能力，避免 `chat completions` 和 `responses` 各自复制解析。
- CLI 新能力没有继续把顶层 `commands/` 目录铺平，而是复用已有 `commands/shared/` 与 `runtime-state/` 组织，并且通过 recorder/query service 把“采集”和“查询”拆开。
- `packages/nextclaw/src/cli/index.ts` 从 400 行降到 390 行，`packages/nextclaw/src/cli/runtime.ts` 回到 815 行，没有继续膨胀。

### 代码增减报告

- 新增：1146 行
- 删除：242 行
- 净增：+904 行

### 非测试代码增减报告

- 新增：1080 行
- 删除：242 行
- 净增：+838 行

### 维护性判断

- 本次是否已尽最大努力优化可维护性：基本是，但没有完成统一日志模块与 retention；原因是本次目标是先把 usage 观测从“最近一次快照”推进到“命令行可查 history / stats”，若直接做项目级 logging，会明显跨出当前需求边界。
- 是否优先遵循删减优先、简化优先、代码更少更好原则：是。新增能力没有再造一套全局诊断框架，而是围绕现有 `nextclaw usage` 入口扩展，并用单一 recorder/query service 收敛多落点逻辑。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：总代码净增明显，原因是这次确实新增了 history store、recorder、query service 和测试；但目录平铺度已尽量控制，没有在 `commands/` 根目录继续增加新的责任平面。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰：更清晰。`LlmUsageRecordFactory` 负责 record 规范化，`LlmUsageRecorder` 负责多落点写入，`LlmUsageSnapshotStore` / `LlmUsageHistoryStore` 负责状态文件，`LlmUsageQueryService` 负责 history / stats 查询，`LlmUsageCommands` 负责 CLI 展示。
- 目录结构与文件组织是否满足当前项目治理要求：本次尽量满足。新逻辑主要落在已有 `runtime-state/` 与 `commands/shared/`，没有继续新增顶层 commands 平铺入口；但 `runtime.ts`、`openai_provider.ts` 与 `create-ui-ncp-agent.ts` 仍然靠近预算上限，后续仍需继续拆。
- 若本次涉及代码可维护性评估，是否基于独立于实现阶段的 `post-edit-maintainability-review`：是。本节基于实现后独立复核填写，不只复述守卫输出。

### 可维护性总结

本次改动把“看得到 prompt cache usage”这件事从“只能看最近一次快照”推进到了“CLI 上能看最近一次、history 和 stats”，结构上比“临时打印日志”更干净。保留的主要债务是 [openai_provider.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/providers/openai_provider.ts) 仍然复杂，而且 usage 这条线还没有升级为统一日志模块；下一步最自然的拆分缝，一条是把 `responses/chat/usage normalization` 继续外提成更聚焦的 provider 子模块，另一条是把当前本地 history 能力提升成项目级 usage/logging 事件抽象。
