# v0.16.15 Touched Directory Name Governance

## 迭代完成说明

- 把命名治理从“新增/重命名强约束，普通 touched legacy 多数只 warning”升级为“只要被触达，就必须在同一次改动里收敛”的阻断策略，覆盖：
  - 源码/脚本/测试文件 kebab-case 文件名
  - 受治理文档 kebab-case 文件名
  - 文件职责与目录后缀边界
- 新增父目录命名 diff gate：
  - 新增 [`scripts/governance/directory-name-kebab-shared.mjs`](/Users/peiwang/Projects/nextbot/scripts/governance/directory-name-kebab-shared.mjs)
  - 新增 [`scripts/governance/lint-new-code-directory-names.mjs`](/Users/peiwang/Projects/nextbot/scripts/governance/lint-new-code-directory-names.mjs)
  - 父目录链一旦存在非合规目录段，会直接阻断 touched 文件继续提交
  - 允许版本/日期目录模式：`v<semver>-<slug>`、`YYYY-MM-DD-<slug>`
  - 保留少量技术目录白名单：例如 `.agents`、`.skild`、`__tests__`
- 扩大治理覆盖范围，使本地 repo skill / governance 资产进入默认命名检查主链路：
  - 源码根扩展到 `bridge`、`.agents`
  - 文档根扩展到 `.agents`
  - `.agents/**/SKILL.md` 作为显式允许的技能文档约定名
- 更新默认治理入口：
  - 根 [`package.json`](/Users/peiwang/Projects/nextbot/package.json) 新增 `pnpm lint:new-code:directory-names`
  - [`scripts/governance/lint-new-code-governance.mjs`](/Users/peiwang/Projects/nextbot/scripts/governance/lint-new-code-governance.mjs) 已接入新的 `directory-name-kebab-case` 检查
- 顺手清掉了因覆盖面扩大而被新扫出的 3 个 `.agents` 文档历史债务：
  - [`demo.md`](/Users/peiwang/Projects/nextbot/.agents/skills/file-organization-governance/demo.md)
  - [`agents.template.md`](/Users/peiwang/Projects/nextbot/.agents/skills/project-os/assets/agents.template.md)
  - [`template.md`](/Users/peiwang/Projects/nextbot/.agents/skills/project-os/assets/docs/logs/template.md)
- 同步更新：
  - [命名工作流](/Users/peiwang/Projects/nextbot/docs/workflows/file-naming-convention.md)
  - [命令索引](/Users/peiwang/Projects/nextbot/commands/commands.md)
  - [AGENTS 规则](/Users/peiwang/Projects/nextbot/AGENTS.md)
  - [file-naming-convention skill](/Users/peiwang/Projects/nextbot/.agents/skills/file-naming-convention/SKILL.md)

## 测试/验证/验收方式

- 运行命名治理相关单测：

```bash
node --test scripts/governance/lint-new-code-file-names.test.mjs scripts/governance/lint-new-code-file-role-boundaries.test.mjs scripts/governance/lint-doc-file-names.test.mjs scripts/governance/lint-new-code-directory-names.test.mjs scripts/governance/lint-new-code-file-directory-collisions.test.mjs
```

- 运行本次改动范围的统一 diff-only 治理入口：

```bash
node scripts/governance/lint-new-code-governance.mjs -- scripts/governance .agents commands docs/workflows
```

- 运行 backlog ratchet：

```bash
pnpm -s check:governance-backlog-ratchet
```

- 运行 targeted maintainability guard：

```bash
node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths scripts/governance/lint-new-code-governance-support.mjs scripts/governance/file-name-kebab-shared.mjs scripts/governance/touched-legacy-governance-contracts.mjs scripts/governance/doc-file-name-shared.mjs scripts/governance/lint-new-code-file-names.mjs scripts/governance/lint-new-code-file-role-boundaries.mjs scripts/governance/lint-doc-file-names.mjs scripts/governance/directory-name-kebab-shared.mjs scripts/governance/lint-new-code-directory-names.mjs scripts/governance/lint-new-code-governance.mjs scripts/governance/lint-new-code-file-names.test.mjs scripts/governance/lint-new-code-file-role-boundaries.test.mjs scripts/governance/lint-doc-file-names.test.mjs scripts/governance/lint-new-code-directory-names.test.mjs package.json commands/commands.md AGENTS.md docs/workflows/file-naming-convention.md .agents/skills/file-naming-convention/SKILL.md
```

- 结果摘要：
  - 单测通过
  - `lint:new-code:governance` 通过
  - `check:governance-backlog-ratchet` 通过
  - tracked source file-name violations 从 `81` 降到 `77`
  - tracked doc file-name violations 保持 `11`
  - targeted maintainability guard 无 error，仅保留 `scripts/governance` 目录预算的既有豁免 warning
  - 未运行整仓 `pnpm lint:maintainability:guard`，因为工作区存在与本次机制改动无关的其它未提交改动，避免把 unrelated diff 混入本次验证结论

## 发布/部署方式

- 本次为仓库治理脚本、文档与规则变更，无需单独服务部署。
- 合入主干后，后续任务默认通过根治理入口获得新行为：
  - `pnpm lint:new-code:governance`
  - `pnpm lint:maintainability:guard`
  - `pnpm check:governance-backlog-ratchet`

## 用户/产品视角的验收步骤

1. 修改一个历史 legacy 源码文件名不合规的文件，例如 `apps/platform-admin/src/pages/LoginPage.tsx`，运行 `pnpm lint:new-code:governance`，确认现在会直接失败，而不是 warning。
2. 修改一个父目录名不合规的 touched 文件，例如 `packages/demo/src/BadDirectory/chat.service.ts`，运行同一命令，确认会被新的 `directory-name-kebab-case` gate 阻断。
3. 修改 `.agents` 下的 skill 文档，例如 `.agents/skills/file-naming-convention/SKILL.md`，确认它仍被视为合法约定名，不会误报。
4. 修改 `.agents` 或 `bridge` 下的脚本文件，确认文件名/目录名仍被检查，但不会被错误套上业务源码的 role suffix 规则。
5. 运行 `pnpm -s check:governance-backlog-ratchet`，确认 baseline 没有反弹。

## 可维护性总结汇总

- 可维护性复核结论：通过。
- 本次顺手减债：是。
- 代码增减报告：
  - 新增：206 行
  - 删除：59 行
  - 净增：+147 行
- 非测试代码增减报告：
  - 新增：162 行
  - 删除：57 行
  - 净增：+105 行
- 是否已尽最大努力优化可维护性：是。本次不是简单叠加一条新规则，而是在保留现有 diff-only 架构的前提下，把 touched file / touched directory 统一拉到一个更可预测的阻断模型里。
- 是否优先遵循删减优先、简化优先、代码更少更好原则：是。虽然新增了一条目录命名 gate，但同时删除了旧的“普通 touched warning / strict touched error”分支判断和多余 contract 配置，避免继续维护两套命名债务策略。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：总代码与文件数净增长，属于最小必要新增。新增主要来自目录命名 gate 与对应测试；同步偿还的维护性债务包括：
  - 删除 touched legacy 命名的双轨 warning/error 分支
  - 删除无继续必要的 strict touched source/doc contract 列表
  - 顺手清掉 3 个 `.agents` 历史文档命名债务
  - tracked source file-name backlog 从 `81` 降到 `77`
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适：更合适。目录命名规则被收敛到独立 shared helper 和单独 diff gate，没有把目录判断补丁式塞回已有 file-name/doc-name 脚本里；role-boundary 也明确保持在适合的业务源码层，不误伤 skill/support script。
- 目录结构与文件组织是否满足当前项目治理要求：基本满足。本次新增文件仍落在既有 `scripts/governance/` 子树内；唯一保留债务是 `scripts/governance` 目录仍高于目录预算，但已有显式豁免，且 targeted maintainability guard 未发现新的无说明膨胀问题。下一步整理入口仍是把该目录继续拆到更细的 `lint/`、`report/`、`shared/` 子树。
- 若本次涉及代码可维护性评估，是否基于独立于实现阶段的 `post-edit-maintainability-review`：是。结论为“通过，无新增可维护性 findings；仅保留 `scripts/governance` 目录预算 warning，经既有豁免说明接受”。
- 长期目标对齐 / 可维护性推进：本次顺着“规则更明确、行为更可预测、历史债务一旦触达就立即收口”的长期方向推进了一步。它减少的不是单个业务模块代码，而是治理机制本身的模糊地带，避免 AI 在 touched legacy 场景里继续留下“这次先 warning、下次再说”的灰区。
