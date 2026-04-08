# Agent Runtime Unification

## 背景

当前仓库里，Agent 级执行后端主要使用 `engine` 命名，NCP 会话级执行后端主要使用 `sessionType` / `session_type` 命名。两套命名分别成立，但对产品和用户来说都在描述同一类概念：这个 Agent / Session 具体跑在哪个 runtime 上。

这会带来三个问题：

1. 用户心智不统一：同样是在选运行内核，却在不同入口看到不同术语。
2. 对外接口割裂：Agent 创建/更新、CLI、UI、spawn 参数无法共用一个稳定命名。
3. 继续扩展时容易膨胀：如果新增 `runtimeType`、继续保留 `engine`、再叠加 `sessionType`，只会让外部契约越来越碎。

## 决策

### 对外统一命名

- Agent 级字段统一使用 `runtime`
- Agent 级配置对象使用 `runtimeConfig`
- `spawn` / `sessions_spawn` 对外新增 `runtime`

### 内部兼容映射

- Agent `runtime -> engine`
- Agent `runtimeConfig -> engineConfig`
- Session / spawn `runtime -> session_type`

### 默认值

- 默认 runtime 仍为 `native`
- 若未显式指定 runtime，则沿用现有默认链路

## 实施范围

1. `@nextclaw/core`
   - 扩展 Agent profile create/update 输入，接受 `runtime` / `runtimeConfig`
   - 对外有效 profile 增加 `runtime` / `runtimeConfig` 视图字段
   - 内部继续写入 `engine` / `engineConfig`

2. Server / UI / CLI Agent API
   - Agent create/update request/view 增加 `runtime` / `runtimeConfig`
   - CLI `agents new/update` 暴露 `--runtime`

3. Spawn / sessions_spawn
   - 工具 schema 增加 `runtime`
   - session creation service 将 `runtime` 写入 `session_type`
   - 保留对旧 `sessionType` 的兼容

4. 前端命名收敛
   - Agent 页面与 Runtime 配置页优先展示 `runtime`
   - 内部仍可兼容旧 `engine` 字段

## 风险与边界

- 不在本轮重写底层配置 schema 的持久化字段名；继续使用 `engine`
- 不在本轮移除 `sessionType`，只做 runtime 别名入口和映射
- 不做大规模历史配置迁移，避免把命名优化升级成高风险兼容改造

## 验证

- Agent profile 单元测试：创建/更新时 `runtime` 正确映射到内部 `engine`
- CLI 单元测试：`agents new/update --runtime` 透传正确
- NCP 工具测试：`spawn` / `sessions_spawn` 传入 `runtime` 后，会话 metadata 正确写入 `session_type`

## 长期目标对齐 / 可维护性推进

这次改动顺着“统一体验优先、入口优先”的长期方向推进了一小步：把同一类概念从多套命名收敛到同一套对外术语，减少未来继续叠加 `engine/runtimeType/sessionType` 并行心智的风险。

本次优先采用“别名收敛 + 内部兼容映射”，而不是直接重写底层 schema，目的是在不扩大迁移成本的前提下先减少外部接口复杂度。删减层面，这次主要是删减概念分裂，而不是删除大量代码；若后续外部契约稳定，再评估是否进一步移除历史 `engine` 暴露和部分 `sessionType` 对外入口。
