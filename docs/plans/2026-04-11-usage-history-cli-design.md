# Usage History CLI Design

## 背景

当前 `nextclaw usage` 只能查看最近一次 LLM usage 快照，已经满足“看最近一次 prompt cache usage”的最低闭环，但还缺两类能力：

1. 历史记录可查，便于 AI 或用户判断最近几次请求是否命中 cache、用了哪个模型、来自哪条运行链路；
2. 轻量统计可查，便于不依赖 UI 面板也能直接在 CLI 上做 usage 观察。

同时，这次不适合顺手引入项目级统一日志模块。仓库里已经在 `docs/TODO.md` 记录了“统一 usage 日志事件模块”待办，所以本次只做一个轻量、局部、可替换的 CLI 侧 usage history 能力。

## 目标

- 保持 `nextclaw usage` 作为统一入口。
- 默认行为不变，仍显示最近一次快照。
- 新增可机读、可复用的 usage history / stats 查询能力。
- 采集、存储、查询分层，避免把格式化、落盘和统计揉进主流程。

## 方案

推荐方案：在现有 observer 旁边补三层轻量结构。

1. `LlmUsageRecorder`
   - 负责把一次 usage 观测写入多个落点。
   - 当前落点包括：
     - `LlmUsageSnapshotStore`：保留最近一次快照；
     - `LlmUsageHistoryStore`：追加写入 JSONL 历史日志。
2. `LlmUsageQueryService`
   - 负责读取快照、读取 history、聚合统计；
   - CLI 只依赖 query service，不直接拼装 store 细节。
3. `LlmUsageCommands`
   - 继续承载命令行展示；
   - 新增 `--history`、`--stats`、`--limit`，保留 `--json`。

## 命令设计

- `nextclaw usage`
  - 保持现状，显示最近一次 usage snapshot。
- `nextclaw usage --history`
  - 显示最近 N 条 usage 记录，默认按时间倒序。
- `nextclaw usage --stats`
  - 聚合当前 history 文件中的统计信息，例如记录数、来源分布、模型分布、总 token、总 cached token、cache hit 次数。
- `nextclaw usage --history --limit 20 --json`
  - 返回机器可读 history 数据，供 AI 自查。

原则：

- 先支持“本机历史 + 轻量统计”，不做复杂筛选、时间窗口 DSL 或 retention 策略。
- 统计逻辑基于 history 记录计算，不额外引入第二套聚合状态。

## 数据格式

- 最近一次快照文件继续沿用 `${NEXTCLAW_HOME:-~/.nextclaw}/run/llm-usage.json`
- 历史文件新增 `${NEXTCLAW_HOME:-~/.nextclaw}/logs/llm-usage.jsonl`
- 每条 history record 与 snapshot 尽量复用同一结构，避免双 schema 漂移

## Deferred

- 通用日志模块
- retention / rotation
- UI usage 面板
- 更复杂的筛选条件（按 source / model / time range）
