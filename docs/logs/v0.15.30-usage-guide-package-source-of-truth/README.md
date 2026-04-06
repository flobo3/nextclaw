# 迭代完成说明

本次迭代把 NextClaw AI 自管理所依赖的 `USAGE.md` 从“workspace 模板快照”收敛为“包内内建 guide”：

- 删除了 `nextclaw init` 向 workspace 写入 `USAGE.md` 的链路，避免每个本地 workspace 长期持有过期快照。
- 新增包内内建 guide 路径 `packages/nextclaw/resources/USAGE.md`，并把原 `sync-usage-template.mjs` 重命名为 `sync-usage-resource.mjs`，构建时同步 `docs/USAGE.md -> resources/USAGE.md`。
- 更新了 `ContextBuilder`、`nextclaw-self-manage` skill、skill routing 文案与 workspace `AGENTS.md` 模板，明确 AI 先读包内 guide，不再把 workspace `USAGE.md` 视为真相源；仅在 repo 开发态且包内 guide 不可用时，才回退到 `docs/USAGE.md`。
- 更新了使用文档与功能总览，明确 `nextclaw init` 不再生成 `USAGE.md`。
- 顺手修复了一个阻塞 `pnpm -C packages/nextclaw build` 的 DTS 推断问题：为 `packages/nextclaw-server/src/ui/router/agents.controller.ts` 的 `getAgentAvatar` 增加显式返回类型。

# 测试/验证/验收方式

已执行：

- `pnpm -C packages/nextclaw-core test -- --run src/agent/tests/context.test.ts`
- `pnpm -C packages/nextclaw test -- --run src/cli/workspace.test.ts`
- `pnpm -C packages/nextclaw-core tsc`
- `pnpm -C packages/nextclaw tsc`
- `pnpm -C packages/nextclaw build`
- `pnpm lint:maintainability:guard`

结果：

- 通过：prompt 测试确认不再要求读取 `<workspace>/USAGE.md`，而是指向包内 `resources/USAGE.md`。
- 通过：workspace 测试确认 `nextclaw init` 后不会再生成 `USAGE.md`。
- 通过：`nextclaw build` 可完整产出 ESM + DTS + `ui-dist`。
- 通过：维护性守卫与新代码治理检查全部通过；仅保留两条已有/轻微 warning：
  - `packages/nextclaw-core/src/agent/context.ts` 接近文件预算上限，但未超限。
  - `packages/nextclaw/src/cli` 目录历史上已偏平，本次未继续恶化。

# 发布/部署方式

本次变更属于 CLI / core / server 代码与文档收敛，若后续发布：

1. 按现有 npm 发布流程执行版本提升与发布。
2. 确保 `nextclaw` 包携带新的 `resources/USAGE.md`。
3. 发布后抽样验证安装包中的 AI 自管理行为，确认它优先读取包内 guide，而不是 workspace 快照。

本次未实际执行发布；仅完成本地构建与验证闭环。

# 用户/产品视角的验收步骤

1. 在一个全新的 `NEXTCLAW_HOME` 下执行 `nextclaw init`。
2. 打开新生成的 workspace，确认存在 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`skills/` 等模板文件，但不再存在 `USAGE.md`。
3. 让 NextClaw AI 执行一个自管理请求，例如“帮我创建一个新的 Agent”或“查看当前版本”。
4. 检查 AI 的操作路径，确认它引用的是包内 guide / repo docs guide，而不是 `<workspace>/USAGE.md`。
5. 若在本仓库开发态运行，再修改 `docs/USAGE.md` 并执行 `pnpm -C packages/nextclaw build`，确认 `packages/nextclaw/resources/USAGE.md` 会同步更新。

# 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。核心动作是删除 workspace `USAGE.md` 这条历史快照链路，而不是再加一层自动同步或隐藏兼容。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。删掉了 workspace 模板写入、删掉了 `templates/USAGE.md` 语义，收敛到包内唯一运行时 guide。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：基本是。总代码净减少明显；虽然新增了 `packages/nextclaw/resources/USAGE.md` 与一个小型 guide-path helper，但分别用于替代被删除的模板文件和避免把路径解析继续塞进 `context.ts`，属于最小必要增长。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。现在职责更清楚：`docs/USAGE.md` 负责作者维护，`resources/USAGE.md` 负责包内运行时读取，`WorkspaceManager` 只管 workspace 模板，`nextclaw-self-manage` 只做稳定路由。
- 目录结构与文件组织是否满足当前项目治理要求：基本满足。本次未让热点目录继续恶化；`packages/nextclaw/src/cli` 的目录平铺 warning 属于既有问题，本次未新增该目录下文件数。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：是。独立复核结论为“通过，无新的 maintainability finding”；本次真正降低了运行时知识漂移，没有把复杂度换个文件继续保留。后续关注点主要是 `packages/nextclaw-core/src/agent/context.ts`，若再扩展系统提示职责，应继续拆分。
