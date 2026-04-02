# Session-Scoped Project Context Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把“会话绑定项目目录”升级为“会话绑定项目上下文”，让项目级 `AGENTS.md` 与项目级 skills 成为 session-scoped 的一等上下文，同时通过改造既有抽象而不是新增平行体系，统一 UI、UI server、runtime 的行为，并把 skill 身份从“按名字猜”升级为“按唯一 `skillRef` 精确引用”。

**Architecture:** 不新增第二套 project context 框架，也不继续在各 runtime 上散落补丁；直接升级既有 `SkillsLoader`、`session/project-root`、`runtime-context` 与 UI server skill 暴露链路。最终形成一条单一主链路：`session.metadata.project_root -> resolved session context -> bootstrap/skills snapshot -> prompt/UI consumption`，并删除旧的分叉加载逻辑。skill 不再按名字去重或覆盖，而是允许同名并存，统一通过唯一 `skillRef` 传递和解析。

**Tech Stack:** TypeScript, NextClaw core runtime-context, existing `SkillsLoader`, session metadata pipeline, Hono UI router, React Query, Zustand, Vitest

---

## 0. 相关文档

- [Chat Session Project Root Design](./2026-04-01-chat-session-project-root-design.md)
- [NextClaw 产品愿景](../VISION.md)

这份文档不是替代 `2026-04-01` 的 project root 设计，而是承接它的下一步：把已经成立的 `project_root` 产品抽象，升级为真正统一、可维护、可复用的 session-scoped project context 实现方案。

## 1. 背景与问题定义

`project_root` 已经成为会话元数据的一部分，且会影响 effective working directory。但当前“项目上下文”仍然是不完整的，表现为：

- 项目自己的 `AGENTS.md` / `SOUL.md` 等 bootstrap 文件虽然部分进入 prompt 语义，但没有被提升成稳定的 session-scoped context 模型。
- 项目自己的 skills 没有和 `project_root` 绑定成统一加载链路。
- 只有部分 runtime 具备 layered skill 能力；其它 runtime 仍然各自 `new SkillsLoader(workspace)`。
- UI 的 skill 列表与 runtime 实际可见 skill 集合不是一个数据源。
- 既有抽象已经开始分叉：`SkillsLoader`、`LayeredSkillsLoader`、runtime 自己的 loader 装配、UI server 单独的 installed skills 视角，各自只覆盖了问题的一部分。

这会带来几个长期风险：

1. 同一会话在 UI 看到的 skill、prompt 中暴露的 skill、runtime 真正能读取的 skill 可能不一致。
2. 再继续修只会演化成更多 `if (projectRoot)` 和更多 runtime 特判。
3. 当前 skill 仍然默认按 `name` 思维建模，无法正确表达“同名但不同来源”的并存能力。
4. `project_root` 被降格成“只影响 cwd 的字段”，而不是 NextClaw 作为统一入口所需要的“项目上下文锚点”。

因此，这次不是补一条扫描逻辑，而是要把 `project_root` 升级为 session-scoped project context 的主语。

## 2. 产品结论

一条明确规则：

```text
session-scoped project context =
  project bootstrap files
  + project-scoped skills
  + host workspace bootstrap context
  + host workspace skills
  + builtin skills
```

但这些内容不能混成一坨文本，也不能通过多套平行实现各自推导。必须统一经过同一个解析结果，再被：

- runtime prompt 消费
- slash skill picker 消费
- UI server skill 接口消费

其中：

- project bootstrap：`<project_root>/AGENTS.md` 等项目级文件
- project skills：`<project_root>/.agents/skills/*/SKILL.md`
- workspace skills：既有 `<workspace>/skills/*/SKILL.md`
- builtin skills：既有 builtin skill 目录

关键补充规则：

- 三层 skills 默认**并存**，不是按名字覆盖。
- 同名 skill 允许同时存在。
- 系统内部不得再用 `name` 作为唯一身份。
- 真正的唯一身份必须是 `skillRef`。

建议的 `skillRef` 形式：

```text
project:<absolute-skill-dir>
workspace:<absolute-skill-dir>
builtin:<skill-name>
```

说明：

- `displayName` 可以重复，供 UI 展示。
- `skillRef` 必须唯一，供系统传输、查找、执行。
- `scope` 只负责解释来源，不承担唯一身份职责。

## 3. 设计原则

### 3.1 不新增平行抽象

禁止引入一套新的 `ProjectContextSkillsLoader` 然后保留旧 `SkillsLoader` / `LayeredSkillsLoader` / runtime 私有拼装逻辑并行存在。

本次要做的是：

- 升级既有 `SkillsLoader`
- 吸收 `LayeredSkillsLoader` 的多层能力
- 替换 runtime 里各自的 loader 装配

### 3.2 会话是主语，项目是上下文

仍然坚持：

- `session` 是产品主语
- `project_root` 是会话上下文字段

不新增 `Project` 持久化实体，不新增 `projectId`，不让项目上下文脱离会话语义单独漂移。

### 3.3 UI 与 runtime 共享同一真相源

前端不自己猜 project skill，runtime 也不自己偷偷多扫一个目录。

同一份 session-scoped context 结果必须同时驱动：

- prompt
- skill picker
- available/installed skills 展示
- requested skill ref resolution

### 3.4 Skill 身份以 ref 为准，不以 name 为准

必须明确禁止以下旧语义继续扩张：

- 按 `skill.name` dedupe
- 按 `skill.name` 覆盖
- `requested_skills: ["deploy"]` 这种靠名字猜测单个 skill 的协议

后续统一规则：

- UI 展示可继续用 `displayName`
- 系统存储、请求、查找、执行一律使用 `skillRef`
- 同名 skill 在 UI 中并列显示，并带 scope/source 标识
- runtime prompt 的 available/requested skills 也必须包含 `skillRef`

### 3.5 Context 分块而非混写

Prompt 必须显式区分：

- `Project Context`
- `Host Workspace Context`
- `Available Skills`

其中 `Project Context` 内再并列表达：

- `Project Bootstrap`
- `Project Skills`

避免模型把项目规则、宿主规则、技能清单混为一谈。

## 4. 既有抽象处理策略

### 4.1 保留并升级

以下抽象保留，但需要升级：

- [`packages/nextclaw-core/src/agent/skills.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/agent/skills.ts)
- [`packages/nextclaw-core/src/session/project-root.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/session/project-root.ts)
- [`packages/nextclaw-core/src/runtime-context/bootstrap-context.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/runtime-context/bootstrap-context.ts)
- [`packages/nextclaw-core/src/runtime-context/runtime-user-prompt.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/runtime-context/runtime-user-prompt.ts)

### 4.2 兼容壳后续删除

以下抽象不应继续扩张，完成迁移后应删除或退化：

- [`packages/nextclaw-core/src/runtime-context/layered-skills-loader.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/runtime-context/layered-skills-loader.ts)

原因：

- 它表达的是“多层技能加载”这个能力；
- 这个能力应成为 `SkillsLoader` 的内建能力，而不是 runtime-context 私有旁支。

### 4.3 必须替换的旧调用点

以下逻辑必须迁移到统一抽象上：

- [`packages/extensions/nextclaw-engine-plugin-codex-sdk/src/index.ts`](/Users/peiwang/Projects/nextbot/packages/extensions/nextclaw-engine-plugin-codex-sdk/src/index.ts)
- [`packages/extensions/nextclaw-engine-plugin-claude-agent-sdk/src/index.ts`](/Users/peiwang/Projects/nextbot/packages/extensions/nextclaw-engine-plugin-claude-agent-sdk/src/index.ts)
- [`packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk/src/claude-runtime-context.ts`](/Users/peiwang/Projects/nextbot/packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk/src/claude-runtime-context.ts)
- UI server 的 skill 暴露与 installed/available list 逻辑

## 5. 目标结构

### 5.1 Session Project Context Snapshot

在既有 `session/project-root` 旁边扩出一个更完整但仍然轻量的 session context 解析模块：

建议目录：

- `packages/nextclaw-core/src/session/session-project-context.ts`

输出类型建议：

```ts
type SessionProjectContext = {
  hostWorkspace: string;
  projectRoot: string | null;
  projectBootstrapRoot: string | null;
  projectSkillsRoot: string | null;
};
```

职责只做解析，不做 prompt 拼接，不做 UI DTO，不做技能枚举。

### 5.2 Scoped Skills Loader

直接升级 `SkillsLoader`，支持多 scope。

建议 `SkillInfo` 扩展：

```ts
type SkillScope = "project" | "workspace" | "builtin";

type SkillInfo = {
  ref: string;
  name: string;
  path: string;
  source: "workspace" | "builtin";
  scope: SkillScope;
};
```

建议构造方式从：

```ts
new SkillsLoader(workspace)
```

升级为：

```ts
new SkillsLoader({
  workspace,
  projectRoot,
  projectSkillsDirName: ".agents/skills",
})
```

行为规则：

- 先枚举 project skills
- 再枚举 workspace skills
- 最后枚举 builtin
- 不按 `name` 去重
- 只允许按 `ref` 去重
- 对外暴露时保留：
  - `ref`
  - `name`
  - `scope`
  - `path`
  - `source`

这样 `LayeredSkillsLoader` 的存在价值会自然消失。

### 5.2.1 Skill DTO 契约

为了避免 UI、server、runtime 再各自定义一份“skill identity”，这里统一约定：

```ts
type SessionSkillEntry = {
  ref: string;
  name: string;
  path: string;
  scope: "project" | "workspace" | "builtin";
  source: "project" | "workspace" | "builtin";
  available: boolean;
};
```

其中：

- `ref`：系统唯一标识
- `name`：展示名，可重复
- `path`：真实 SKILL.md 路径或 skill 根路径
- `scope/source`：解释层次来源
- `available`：requirements 检查后的可用性

### 5.3 Bootstrap Context 分层

不新建第二个 prompt builder，而是增强既有 `bootstrap-context.ts`。

增强目标：

- 把 `projectRoot` 当成项目级 bootstrap 根
- 保留 `hostWorkspace` 的宿主 bootstrap 语义
- 输出时显式分组

建议新增结构化构建函数，而不是继续在字符串里横向拼接：

```ts
buildWorkspaceProjectContextSection({
  hostWorkspace,
  projectRoot,
  ...
})
```

内部应明确分块：

- `Project Context`
- `Host Workspace Context`

### 5.4 Session-Scoped Skill View for UI

UI server 不再只按 host workspace 视角返回 skills。

建议新增一条 session-aware 只读接口，返回上面的 `SessionSkillEntry[]`。

前端的 slash skill picker 改为：

- 当前会话有 `project_root` 时，显示 session-scoped skills
- 无 `project_root` 时，退化为 workspace + builtin
- 同名 skill 并列显示，不合并
- 选择动作返回 `skillRef`，不是 `name`

## 6. 分阶段实施

### Phase 1: 收敛共享解析层

目标：

- 不改 UI 行为
- 先把 core 的 session project context 与 scoped skills loader 做成可复用基础

产出：

- `session-project-context.ts`
- 升级后的 `SkillsLoader`
- `LayeredSkillsLoader` 标记为兼容壳
- 单测覆盖 project/workspace/builtin 并存与 `skillRef` 唯一性

验收：

- 不同 `project_root` 下同名 skill 能正确并存
- 没有 `project_root` 时行为与现在兼容

### Phase 2: 收敛 runtime consumption

目标：

- 所有 runtime 统一走升级后的 loader/context

产出：

- Codex/Claude/其它 NCP runtime 替换掉私有 `new SkillsLoader(workspace)` 逻辑
- `runtime-user-prompt.ts` 与 `bootstrap-context.ts` 输出 project-scoped 分块

验收：

- 同一 session 在不同 runtime 下看到相同的 skill 集合
- Prompt 中项目 `AGENTS.md` 与项目 skills 位置清晰、不混淆 host workspace

### Phase 3: 收敛 UI server 与前端 skill 视图

目标：

- 让前端看到的 skills 与 runtime 真正使用的 skills 对齐

产出：

- session-aware skill list API
- slash skill picker 支持 scope 标签
- slash skill picker 改为按 `skillRef` 选中/发送
- 会话切换 `project_root` 后自动刷新 skill source

验收：

- 前端 UI skill 列表与 runtime `available_skills` 对齐
- 项目切换后，不刷新页面也能看到 skill 作用域变化
- 同名 skill 在 UI 中能稳定并列展示并被分别选中

### Phase 4: 删除旧分叉

目标：

- 不再保留 layered/private skill assembly 的历史路径

产出：

- 删除 `LayeredSkillsLoader` 或让其仅转发到 `SkillsLoader`
- 删除 runtime 私有的多层 skill 拼装分支
- 文档只保留一种官方说明

验收：

- 仓库中不再存在多套 skill identity / context contract 规则

## 7. 详细任务拆解

### Task 1: 升级 session project context 解析入口

**Files:**
- Modify: [`packages/nextclaw-core/src/session/project-root.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/session/project-root.ts)
- Create: [`packages/nextclaw-core/src/session/session-project-context.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/session/session-project-context.ts)
- Test: `packages/nextclaw-core/src/session/project-root.test.ts`

**Steps:**
1. 把现有 `readSessionProjectRoot/resolveSessionWorkspacePath` 保留为兼容入口。
2. 新增 `resolveSessionProjectContext(...)`，输出 host workspace、project root、project skill root。
3. 明确项目 skills 根目录固定为 `<project_root>/.agents/skills`。
4. 为“无项目目录 / 有项目目录 / 非法 metadata 值”补单测。

**Done when:**
- 新 API 不破坏旧调用点。
- 后续 runtime/UI server 可以直接拿统一解析结果。

### Task 2: 升级 `SkillsLoader` 为多 scope loader

**Files:**
- Modify: [`packages/nextclaw-core/src/agent/skills.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/agent/skills.ts)
- Modify/Delete: [`packages/nextclaw-core/src/runtime-context/layered-skills-loader.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/runtime-context/layered-skills-loader.ts)
- Test: `packages/nextclaw-core/src/agent/tests/context.test.ts`

**Steps:**
1. 把构造器改为支持 `projectRoot` 或显式 project skills path。
2. 给 `SkillInfo` 增加 `ref` 与 `scope` 字段。
3. 把多层枚举与 `ref` 生成内建到 `SkillsLoader`，禁止再按名字 dedupe。
4. 让 `LayeredSkillsLoader` 改为转发到新 `SkillsLoader`，避免继续演化。
5. 为同名 skill 并存、fallback 到 workspace/builtin、requirements 过滤补测试。

**Done when:**
- 仓库只有一套 skill identity 逻辑，且这套逻辑不依赖 `name`。

### Task 3: 升级 runtime prompt 的 project context 分块

**Files:**
- Modify: [`packages/nextclaw-core/src/runtime-context/bootstrap-context.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/runtime-context/bootstrap-context.ts)
- Modify: [`packages/nextclaw-core/src/runtime-context/runtime-user-prompt.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/runtime-context/runtime-user-prompt.ts)
- Test: [`packages/nextclaw-core/src/agent/tests/runtime-user-prompt.test.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-core/src/agent/tests/runtime-user-prompt.test.ts)

**Steps:**
1. 用 `resolveSessionProjectContext(...)` 取代散落的 `projectRoot/hostWorkspace` 读法。
2. 输出 `Project Context` 与 `Host Workspace Context` 两个明确区块。
3. 把 requested/available skills 从 name-only 清单升级为包含 `skillRef` 的清单。
4. 补测试：项目 `AGENTS.md`、宿主 workspace skill、项目 skill 同时存在且出现同名 skill 时的 prompt 结构。

**Done when:**
- 模型可以明确区分“项目规则”和“宿主规则”。

### Task 4: 替换 runtime 私有 skills 装配

**Files:**
- Modify: [`packages/extensions/nextclaw-engine-plugin-codex-sdk/src/index.ts`](/Users/peiwang/Projects/nextbot/packages/extensions/nextclaw-engine-plugin-codex-sdk/src/index.ts)
- Modify: [`packages/extensions/nextclaw-engine-plugin-claude-agent-sdk/src/index.ts`](/Users/peiwang/Projects/nextbot/packages/extensions/nextclaw-engine-plugin-claude-agent-sdk/src/index.ts)
- Modify: [`packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk/src/claude-runtime-context.ts`](/Users/peiwang/Projects/nextbot/packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk/src/claude-runtime-context.ts)
- Modify: 相关 runtime tests

**Steps:**
1. 删除 runtime 内部直接 `new SkillsLoader(workspace)` 的调用。
2. 统一改成由 session project context 驱动的新 loader。
3. 删除 runtime 间不一致的 supporting workspace 拼装差异。
4. 为 Codex / Claude / native 链路补同一 session 下 skill 解析一致性的测试。

**Done when:**
- 不同 runtime 对同一 session 的 skill 可见性一致。

### Task 5: 暴露 session-aware skill list API

**Files:**
- Modify: [`packages/nextclaw-server/src/ui/router/types.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-server/src/ui/router/types.ts)
- Modify: [`packages/nextclaw-server/src/ui/router/marketplace/installed.ts`](/Users/peiwang/Projects/nextbot/packages/nextclaw-server/src/ui/router/marketplace/installed.ts)
- Create/Modify: session-scoped skill list route/controller
- Test: server route tests

**Steps:**
1. 新增会话级 skills read API，输入 session key。
2. 后端通过 session metadata.project_root 解析 effective skill list。
3. 返回 `ref + name + scope + path + available`，前端不自己猜目录，也不自己生成唯一标识。
4. 为不存在 session / 无 project_root / 有 project skills / 同名并存补测试。

**Done when:**
- UI server 和 runtime 共用同一份 skill 视图规则。

### Task 6: 前端 slash skill picker 改为 session-scoped

**Files:**
- Modify: chat skill picker / slash 相关前端模块
- Modify: 相关 query hooks
- Test: chat picker tests

**Steps:**
1. 让前端根据当前 session key 请求 session-aware skills。
2. 在 UI 上显示 scope badge：`Project` / `Workspace` / `Builtin`。
3. 同名 skill 保持并列，内部选中值为 `skillRef`。
4. 切换 `project_root` 或切换会话后自动刷新。
5. 补测试：skill 列表切换、同名 skill 并列展示与独立选择、无项目目录 fallback。

**Done when:**
- 用户在前端看到的技能集合和后端/运行时一致。

### Task 7: 删除旧路径并更新文档

**Files:**
- Modify/Delete: 历史 layered/私有 loader 代码
- Modify: docs/USAGE / chat/project docs
- Modify: 相关迭代日志与测试说明

**Steps:**
1. 删除已迁移完成的旧 loader 分支。
2. 更新文档，明确项目私有 skills 放在 `<project_root>/.agents/skills`。
3. 明确 `AGENTS.md` 属于项目 bootstrap context，而不是 project skill。
4. 复核命名、identity 规则和目录说明在产品文档中只有一份权威定义。

**Done when:**
- 仓库中不再存在第二套官方说法。

## 8. 验证清单

### 核心行为

- session 绑定 `project_root` 后，runtime prompt 可以看到项目自己的 `AGENTS.md`。
- session 绑定 `project_root` 后，`<project_root>/.agents/skills` 中的技能可见。
- 项目 skill 与 workspace skill 同名时，两者同时可见，且 `skillRef` 不同。
- 切到另一个 `project_root` 的会话后，skill 列表与 prompt 同步切换。
- 无 `project_root` 时，系统退化到 host workspace + builtin，不报错、不隐式猜项目。

### 一致性

- UI 显示的 skill 名称、`skillRef`、scope、可用性与 runtime 实际一致。
- native / codex / claude 不再各自维护不同的 skill 装配规则。

### 回归

- 现有 workspace skill 安装与使用流程不被破坏。
- builtin skills 仍然可用。
- 旧 `requested_skills` name-only 行为只作为短期兼容输入保留；新的主协议为 `requested_skill_refs`。

### 协议迁移

- 新协议主字段：`requested_skill_refs: string[]`
- 旧协议兼容字段：`requested_skills: string[]`
- 兼容规则：
  - 若只收到 `requested_skill_refs`，按 ref 精确解析
  - 若只收到 `requested_skills`，先尝试 name-only 兼容解析
  - 若 name-only 命中多个 skill，必须返回显式歧义错误，要求前端改传 `requested_skill_refs`
  - 当前后端都已支持 `requested_skill_refs` 后，前端默认不再发送 `requested_skills`

## 9. 最小验证命令

以下命令不是最终全量回归，只是每个阶段的最小充分验证基线：

### Phase 1

```bash
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core test -- --run src/session/project-root.test.ts src/agent/tests/context.test.ts
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core exec tsc -p tsconfig.json --noEmit
```

### Phase 2

```bash
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core test -- --run src/agent/tests/runtime-user-prompt.test.ts
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-engine-plugin-codex-sdk exec tsc -p tsconfig.json --noEmit
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-engine-plugin-claude-agent-sdk exec tsc -p tsconfig.json --noEmit
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk exec tsc -p tsconfig.json --noEmit
```

### Phase 3

```bash
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server test -- --run src/ui/router.marketplace-manage.test.ts src/ui/router.marketplace-content.test.ts
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui test -- --run src/components/chat/**/*.test.tsx src/components/chat/**/*.test.ts
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui exec tsc -p tsconfig.json --noEmit
```

### 全阶段收尾

```bash
PATH=/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard
```

## 10. 风险与边界

### 风险 1：一次性改太多 runtime

控制方式：

- 先完成 core 抽象收敛，再逐个 runtime 切换
- 每切一个 runtime 就补一致性测试，不做“大爆改后一起验”

### 风险 2：UI 和 runtime 暂时不同步

控制方式：

- 在 session-aware skill list API 落地前，不把前端宣称为“项目技能已完整支持”
- 前后端切换窗口期必须用 feature flag 或明确注释隔离

### 风险 3：名字相同导致协议含糊

控制方式：

- 尽快把 name-only 选择协议迁移到 `skillRef`
- 兼容期内一旦发现按名字命中多个 skill，必须返回显式歧义错误，不允许静默猜测

### 风险 4：目录继续膨胀

控制方式：

- 不新增 `project-context/`、`runtime-context/`、`skills-loader/` 三套并行目录
- 优先在既有模块内升级；只有当单文件职责明显失控时再拆

## 11. 明确不做

本轮不做：

- 独立 `Project` 产品实体
- 项目级 skill marketplace 安装目标改造
- 自动探测 git repo 并隐式绑定 project_root
- 按项目保存独立会话模板
- 为项目上下文再增加一套单独存储系统
- 继续把 `name` 当作 skill 唯一身份
- 在同名 skill 之间做静默覆盖或静默合并

## 12. 推荐执行顺序

推荐顺序必须是：

1. core 解析与 loader 收敛
2. runtime 消费统一
3. UI server skill read 统一
4. 前端 skill picker 接入
5. 删除旧分叉

不能反过来先改 UI，因为那样会把“前端看起来支持了项目 skill”建立在一套还没稳定的后端规则上。

## 13. 方案完成定义

当满足以下条件时，认为这次重构完成：

- `project_root` 不再只是 cwd 字段，而是 session-scoped project context 的入口。
- `AGENTS.md` 与项目 skills 都进入统一 project context 模型，但在 prompt 中分块清晰。
- `SkillsLoader` 成为唯一的多 scope skill 解析实现。
- skill identity 统一收敛到 `skillRef`，不再按名字 dedupe。
- `LayeredSkillsLoader` 与 runtime 私有 loader 拼装逻辑被删除或退化成薄兼容层。
- UI、UI server、runtime 三边对 skill 集合、`skillRef` 身份和 context 分层的理解一致。
