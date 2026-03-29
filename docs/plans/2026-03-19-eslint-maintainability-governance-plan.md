# Nextbot ESLint And Maintainability Governance Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不放宽既有治理方向的前提下，把 `nextbot` 的可维护性治理从“只盯文件/函数行数”升级为“长度 + 职责复杂度 + 变更闸门”三层机制。

**Architecture:** 继续让 ESLint 负责通用静态约束，负责便宜、稳定、编辑期可见的坏味道检测；让 `post-edit-maintainability-guard` 负责仓库语义化、只拦新增债务、输出拆分建议。避免把所有语义都塞进 ESLint，也避免把所有判断都留给人工 review。

**Tech Stack:** ESLint flat config、`eslint-plugin-sonarjs`、Node 报告脚本、Python 可维护性守卫脚本。

---

## 现状判断

截至 2026-03-19，仓库根级 line-limit 基线已经存在：

- 根配置已启用 `max-lines=800` 与 `max-lines-per-function=150`
- UI 组件已有 `max-lines-per-function=300` 的局部放宽
- `post-edit-maintainability-guard` 已能检查变更文件的文件级长度漂移

但当前仍存在两个明显缺口：

1. ESLint 主要抓“长度”，还抓不到“一个函数承担过多阶段职责”
2. maintainability skill 只做文件级预算漂移，抓不到函数级新增债务

本次方案的核心目标不是继续堆更多通用规则，而是把治理升级成：

1. ESLint 负责提前暴露坏味道
2. maintainability skill 负责只阻断新增债务
3. 历史债务继续清理，但不拖死每次改动

## 治理原则

### 1. 不回退现有收紧方向

- 不新增“为了过 lint 而放宽一大片范围”的例外
- 不因为历史债务存在，就放弃对新增债务的阻断
- 不把“可维护性”重新降回 review 口头建议

### 2. 先抓函数职责爆炸，再继续收文件长度

当前仓库里的主要痛点已经不是单纯文件长，而是：

- 编排函数承担初始化、发现、过滤、校验、装配、落盘多个阶段
- 多个分支重复同一组副作用
- 一个函数里持续改写多个共享容器

因此第二阶段治理重点应从“文件长度”转向“函数职责复杂度”。

### 3. ESLint 负责通用规则，skill 负责仓库语义和 diff gate

分工必须清楚：

- ESLint 适合便宜、稳定、开发期可见的规则
- skill 适合变更后检查、只对本次改动阻断、输出拆分位点

不建议把所有仓库语义硬塞进 ESLint 自定义规则，也不建议把所有静态检测都堆进 Python 脚本里重造一遍。

## 推荐的 ESLint 规则清单

### 保留不动

这些规则已经和仓库历史治理方向一致，继续保留：

- `max-lines`: `warn`，`800`
- `max-lines-per-function`: `warn`，默认 `150`
- UI 组件 `max-lines-per-function`: `warn`，`300`
- `@typescript-eslint/no-unused-vars`
- `@typescript-eslint/consistent-type-imports`
- `react-hooks` 相关规则

### 立刻新增

#### 1. `max-statements`

- 默认：`warn`，`30`
- 测试文件：`warn`，`45`
- UI 组件 / TSX 容器：`warn`，`60`

作用：

- 比纯行数更早发现“函数承担太多步骤”
- 对编排函数、CLI command、controller、manager 的帮助最大

#### 2. `max-depth`

- 默认：`warn`，`4`

作用：

- 便宜
- 能较早抓住分支地狱
- 不会像更激进规则一样制造大量噪音

#### 3. `sonarjs/cognitive-complexity`

- 先只在非 TSX 编排重区启用：`warn`，`18`

首批目标范围：

- `packages/nextclaw/**/*.{ts,mts,cts}`
- `packages/nextclaw-core/**/*.{ts,mts,cts}`
- `packages/nextclaw-server/**/*.{ts,mts,cts}`
- `packages/nextclaw-openclaw-compat/**/*.{ts,mts,cts}`
- `workers/**/*.{ts,mts,cts}`
- `packages/extensions/nextclaw-channel-runtime/**/*.{ts,mts,cts}`

作用：

- 比经典 `complexity` 更接近“阅读和维护成本”
- 很适合识别 `service` / `loop` / `controller` / `router` / `loader` 这类编排型函数

前提：

- 新增依赖 `eslint-plugin-sonarjs`

#### 4. 测试文件函数长度 override

- 测试文件 `max-lines-per-function`: `warn`，`220`

原因：

- 当前历史债务里有一批 `170-203` 行的测试函数
- 如果继续按 `150` 一刀切，会把不少“中等噪音”与“真正超大测试”混在一起
- 提升到 `220` 后，`457`、`703` 这类真正需要拆分的巨型测试仍会保留

### 暂不新增

以下规则目前不建议立即上：

- 全局继续收紧 `max-lines`
- 全局继续收紧 `max-lines-per-function`
- 在所有 TSX 上直接启用 `cognitive-complexity`
- 自定义 ESLint 规则抓“重复 finalize 模式”
- `import/no-cycle` 作为第一阶段硬要求

原因：

- 当前仓库仍有明显历史 line-limit 债务
- 先加更接近职责边界的规则，收益更高
- 拆分开始变多之后，再视情况补循环依赖约束更合适

## 推荐的 ESLint 配置结构

建议把根配置分成四层：

1. 基础 TS 规则层
2. 长度规则层
3. 复杂度规则层
4. 场景 override 层

建议落地方式：

- 根配置统一声明默认 `max-lines`、`max-lines-per-function`、`max-statements`、`max-depth`
- 测试文件统一 override `max-lines-per-function=220`、`max-statements=45`
- UI 组件统一 override `max-lines-per-function=300`、`max-statements=60`
- 编排重区统一启用 `sonarjs/cognitive-complexity=18`

这样做的好处是：

- 规则结构更清楚
- 新子项目更容易继承
- 和 AGENTS.md 中“新子项目必须带 ESLint 基线”的规则保持一致

## `post-edit-maintainability-guard` 升级方案

### 当前职责保留

现有脚本应继续保留这些能力：

- 自动枚举 working tree 变更文件
- 文件级预算判定
- 与 `HEAD` 的长度漂移对比
- 风险文件的拆分缝建议

这些能力没有问题，不应删除。

### 升级目标

把 skill 从“文件长度检查器”升级为“变更级可维护性闸门”。

### 第一阶段升级

#### 1. 新增函数级检查

skill 不自己重写完整的 TS AST 分析，而是复用 ESLint 输出：

- 运行定向 ESLint
- 收集本次改动文件中与以下规则相关的消息：
  - `max-lines-per-function`
  - `max-statements`
  - `max-depth`
  - `sonarjs/cognitive-complexity`

然后把这些结果并入 maintainability report。

#### 2. 只拦新增债务

skill 的核心判断不应该是“仓库里还有没有历史 warning”，而应该是：

- 本次改动有没有新增新的可维护性债务
- 本次是否让原本已坏的文件继续恶化

推荐阻塞条件：

- 新文件直接超预算
- 文件从预算内增长到预算外
- 原本已超预算的文件继续增长
- 本次改动引入新的函数级 limit warning
- 已超限函数在本次改动中继续变长或继续变复杂
- 新增 `eslint-disable max-lines` 或 `eslint-disable max-lines-per-function`

推荐警告条件：

- 文件或函数达到预算线的 80%
- 触达历史债务文件但本次未继续恶化
- 单文件同时命中多个函数级 warning

#### 3. 输出维度升级

输出除了保留当前字段，还应补充：

- `function_findings`
- `rule_id`
- `symbol_name`
- `source`（`file-budget` / `eslint-function-budget` / `disable-comment`）
- `next_split_seam`

### 第二阶段升级

在第一阶段稳定后，再加入轻量仓库语义：

- 若文件名或路径命中 `service/controller/manager/runtime/loop/router/provider`
  - 输出编排类拆分建议
- 若命中 UI 容器
  - 输出 hooks / sections / normalization helpers 的拆分建议
- 若命中测试
  - 输出 fixtures / builders / scenario groups 的拆分建议

这一步的目的不是“更聪明”，而是让输出从“报错”变成“指导下一刀怎么拆”。

### 第三阶段升级

只有当前两阶段仍无法覆盖主要痛点时，才考虑新增更重的启发式：

- 一个函数里改写多个共享容器
- 多个分支重复同一组 finalize / error handling 副作用

这一步不要抢先做。

## 共享阈值与单一来源

为避免 ESLint、报告脚本、maintainability skill 三处阈值漂移，建议引入单一来源配置。

推荐形式：

- 新增一份轻量配置模块，例如 `scripts/maintainability-thresholds.mjs`
- 或新增一份 JSON/TS 配置文件，由以下位置共用：
  - `eslint.config.mjs`
  - `scripts/eslint-maintainability-report.mjs`
  - `.agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs`

至少要统一这些值：

- 默认 `max-lines`
- 默认 `max-lines-per-function`
- UI override
- 测试 override
- `max-statements`
- `max-depth`
- `cognitive-complexity`

## 分阶段实施顺序

### Task 1: 补齐 ESLint 第二层复杂度规则

**Files:**

- Modify: `eslint.config.mjs`
- Modify: `package.json`

**Outcome:**

- 保持现有 line-limit 基线不回退
- 新增 `max-statements`、`max-depth`
- 引入 `eslint-plugin-sonarjs`
- 新增测试 override 与编排重区 complexity override

### Task 2: 升级 line-limit 报告脚本

**Files:**

- Modify: `scripts/eslint-maintainability-report.mjs`

**Outcome:**

- 报告不再只统计 `max-lines` / `max-lines-per-function`
- 还要能统计 `max-statements`、`max-depth`、`sonarjs/cognitive-complexity`
- 输出按 workspace / file / rule 聚合

### Task 3: 升级 maintainability guard

**Files:**

- Modify: `.agents/skills/post-edit-maintainability-guard/SKILL.md`
- Modify: `.agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs`

**Outcome:**

- 保留文件级预算检查
- 新增函数级 ESLint 结果汇总
- 只对本次改动新增债务做阻塞
- 输出拆分位点与风险来源

### Task 4: 建立“禁止新增 disable 债务”约束

**Files:**

- Modify: `.agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs`
- Optional: `eslint.config.mjs`

**Outcome:**

- 新增 `eslint-disable max-lines` / `max-lines-per-function` / complexity 相关 disable 时报警
- 默认不接受“为了过关临时关规则”的回退路径

### Task 5: 用现有历史债务做一次基线验证

**Files:**

- No new source file required

**Outcome:**

- 明确哪些 warning 会被新方案保留
- 明确哪些 warning 属于噪音，已通过 override 降噪
- 确认新方案主要拦“新增坏味道”，而不是把整个仓库一次性炸红

## 验收标准

### ESLint 层

执行后应满足：

- 新规则能在目标范围内生效
- 历史债务没有因为规则冲突导致大量误报
- TSX 不因过早启用 `cognitive-complexity` 而产生大面积噪音

### Maintainability skill 层

执行后应满足：

- 纯文档改动继续显示“不适用”
- 普通代码改动能同时得到文件级和函数级结果
- 仓库既有 warning 不会默认阻塞每次任务
- 新增债务会被明确标为阻塞项
- 输出里包含下一步拆分位点

## 建议执行命令

### ESLint 验证

```bash
pnpm lint:maintainability:report
pnpm exec eslint packages/nextclaw-openclaw-compat/src/plugins/loader.ts
pnpm exec eslint packages/nextclaw/src/cli/commands/service.ts
pnpm exec eslint packages/nextclaw-core/src/agent/loop.ts
```

### Maintainability skill 验证

```bash
node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --json --no-fail
node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-openclaw-compat/src/plugins/loader.ts --json --no-fail
```

## 最终判断

`nextbot` 现在最该做的，不是继续单独收紧“文件长度”，而是建立下面这套组合：

- ESLint 继续负责通用长度边界
- ESLint 新增职责复杂度边界
- maintainability skill 负责只阻断新增债务

这套组合能最大程度避免再次出现 `loadOpenClawPlugins` 这类“逻辑没错，但已经演化成编排巨函数”的问题。
