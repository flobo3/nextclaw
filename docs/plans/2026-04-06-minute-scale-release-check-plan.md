# 2026-04-06 Minute-Scale Release Check Plan

## 背景

真实回放表明，发布链路慢并不只是“单个 bundler 不够快”。

旧链路同时存在三类结构性浪费：

- 大量库包继续停留在 `tsup`
- `release:check` 把 lint 也当成发布前必跑项
- 一些包的 `build` 本身已经做了类型检查，却又在批处理里重复跑 `tsc`

这意味着即使继续堆并发，整体也只是在放大无效工作与资源争用。

## 目标

1. 用更现代的库构建器替代 `tsup`。
2. 让 `release:check` 只保留发布闭环真正需要的默认检查。
3. 把 `build`、`typecheck`、`lint` 的职责边界重新拉直。
4. 在不破坏现有产物契约的前提下，把默认 release check 压到分钟级附近。

## 非目标

- 本次不重做 changeset publish 本身
- 本次不改 npm registry 轮询校验策略
- 本次不引入新的 monorepo task runner

## 方案

### 1. 库包构建统一迁到 `tsdown`

对当前发布链路里的 TypeScript 库包，统一从 `tsup` 迁到 `tsdown`：

- 默认单入口包直接使用 `tsdown src/index.ts`
- 原来 `bundle: false` 的包统一用 `--unbundle`
- 需要 external 的包显式声明 `--deps.never-bundle`
- 统一加上 `--no-fixedExtension`，保持产物仍为 `.js` / `.d.ts`，不破坏现有 `exports` 契约

这样可以删掉散落的 `tsup.config.ts`，把大多数包收敛成同一种 build 约定。

### 2. `release:check` 改成“发布关键路径检查”

默认 `release:check` 只跑：

- `build`
- `typecheck`

默认不再把 `lint` 作为发布前必跑项。原因很明确：

- lint 不决定包是否能被正确构建与发布
- lint 更适合放在开发期、CI 或显式 strict gate
- 把 lint 放进默认发布前校验，只会拖慢发版而不提高发布产物正确性

若需要当前 release batch 的更严格静态门禁，显式执行：

- `pnpm release:check:strict`

若需要历史意义上的整仓全量门禁，显式执行：

- `pnpm release:check:all`

### 3. `build` 与 `tsc` 彻底职责分离

对原来写成 `tsc && vite build` 的包，统一改成：

- `build` 只做构建
- `tsc` 只做类型检查

这样可以避免同一套类型检查逻辑被 `build` 与 `release:check` 双重触发，也让脚本语义更可预测。

### 4. 共享 release step 解析层

新增共享的 release step 解析模块，让不同入口复用同一套规则：

- 默认哪些脚本属于发布校验
- 何时应该跳过重复的 `tsc`
- 何时按 `strict` 模式纳入 `lint`

这样前端发布与通用发布不再各写一套规则，避免继续分叉。

### 5. 分步骤并发池，而不是粗暴全并发

`release:check` 的调度器继续保持 DAG 调度，但引入分步骤并发池：

- `build`
- `tsc`
- `lint`

每类步骤都有独立上限，避免重型 build 把 CPU、I/O 和 dts 生成全部挤爆。

## 当前结果

在同一批 release checkpoint 上，真实回放结果为：

- 旧版并发回放约 `3 分 18 秒`
- 这次默认 `release:check` 约 `1 分 46 秒`

这说明方向是对的：真正有效的提升，不是继续堆并发，而是先删除不该跑的检查、收敛构建语义，再对剩下的关键路径做更合理的调度。

## 下一步

若继续逼近 `1 分钟`，优先级应该是：

1. 继续减少默认 release check 中的重复 type work
2. 深挖最慢包的 dts 生成成本，特别是 `@nextclaw/core`、`@nextclaw/channel-runtime`、`@nextclaw/mcp`、`@nextclaw/server`
3. 评估是否要把部分大包拆成更稳定的发布边界，而不是让单包承担过大的声明生成成本
