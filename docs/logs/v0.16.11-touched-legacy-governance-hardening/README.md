# v0.16.11 Touched Legacy Governance Hardening

## 迭代完成说明

- 落地“新增阻断 + strict touched governance + backlog ratchet”三层治理机制，解决仓库长期存在的“新增文件约束强、触达存量约束弱”问题。
- 新增机器可读 contract 数据源 [`scripts/touched-legacy-governance-contracts.mjs`](/Users/peiwang/Projects/nextbot/scripts/touched-legacy-governance-contracts.mjs)，用于声明：
  - strict touched legacy source paths
  - strict touched flat directory paths
  - docs naming roots
  - strict touched legacy doc paths
  - governance backlog baseline 文件位置
- 升级现有源码命名治理：
  - [`scripts/lint-new-code-file-names.mjs`](/Users/peiwang/Projects/nextbot/scripts/lint-new-code-file-names.mjs)
  - [`scripts/lint-new-code-file-role-boundaries.mjs`](/Users/peiwang/Projects/nextbot/scripts/lint-new-code-file-role-boundaries.mjs)
  - [`scripts/lint-new-code-flat-directories.mjs`](/Users/peiwang/Projects/nextbot/scripts/lint-new-code-flat-directories.mjs)
- 新增文档命名治理：
  - [`scripts/doc-file-name-shared.mjs`](/Users/peiwang/Projects/nextbot/scripts/doc-file-name-shared.mjs)
  - [`scripts/lint-doc-file-names.mjs`](/Users/peiwang/Projects/nextbot/scripts/lint-doc-file-names.mjs)
  - [`scripts/report-doc-file-name-violations.mjs`](/Users/peiwang/Projects/nextbot/scripts/report-doc-file-name-violations.mjs)
- 新增 tracked backlog ratchet：
  - [`scripts/check-governance-backlog-ratchet.mjs`](/Users/peiwang/Projects/nextbot/scripts/check-governance-backlog-ratchet.mjs)
  - [`scripts/governance-backlog-baseline.json`](/Users/peiwang/Projects/nextbot/scripts/governance-backlog-baseline.json)
- 将 docs 命名 diff gate 接入 [`scripts/lint-new-code-governance.mjs`](/Users/peiwang/Projects/nextbot/scripts/lint-new-code-governance.mjs) 与根 [`package.json`](/Users/peiwang/Projects/nextbot/package.json) 的默认治理入口，并补充新命令：
  - `pnpm lint:new-code:doc-file-names`
  - `pnpm report:doc-file-naming`
  - `pnpm check:governance-backlog-ratchet`
- 同步更新治理文档与元规则：
  - [治理计划文档](/Users/peiwang/Projects/nextbot/docs/plans/2026-04-13-touched-legacy-governance-hardening-plan.md)
  - [命名工作流](/Users/peiwang/Projects/nextbot/docs/workflows/file-naming-convention.md)
  - [命令索引](/Users/peiwang/Projects/nextbot/commands/commands.md)
  - [AGENTS 规则](/Users/peiwang/Projects/nextbot/AGENTS.md)

## 测试/验证/验收方式

- 运行脚本测试：

```bash
node --test scripts/lint-new-code-file-names.test.mjs scripts/lint-new-code-file-role-boundaries.test.mjs scripts/lint-new-code-flat-directories.test.mjs scripts/lint-doc-file-names.test.mjs scripts/check-governance-backlog-ratchet.test.mjs
```

- 运行本次改动范围内的 diff-only 治理检查：

```bash
pnpm -s lint:new-code:governance -- scripts docs commands
```

- 运行 tracked backlog ratchet：

```bash
pnpm -s check:governance-backlog-ratchet
```

- 运行针对本次脚本改动的 maintainability guard：

```bash
node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths scripts/touched-legacy-governance-contracts.mjs scripts/doc-file-name-shared.mjs scripts/report-doc-file-name-violations.mjs scripts/lint-doc-file-names.mjs scripts/lint-doc-file-names.test.mjs scripts/check-governance-backlog-ratchet.mjs scripts/check-governance-backlog-ratchet.test.mjs scripts/governance-backlog-baseline.json scripts/lint-new-code-file-names.mjs scripts/lint-new-code-file-role-boundaries.mjs scripts/lint-new-code-flat-directories.mjs scripts/lint-new-code-file-names.test.mjs scripts/lint-new-code-file-role-boundaries.test.mjs scripts/lint-new-code-flat-directories.test.mjs scripts/report-file-name-kebab-violations.mjs scripts/lint-new-code-governance.mjs package.json
```

- 结果摘要：
  - 脚本测试通过
  - diff-only 治理检查通过
  - backlog ratchet 通过，当前 tracked baseline 为：
    - source file-name violations: `81`
    - doc file-name violations: `11`
  - maintainability guard 无 error；存在 `scripts/` 目录预算豁免 warning，属于已有例外说明覆盖范围

## 发布/部署方式

- 本次为仓库治理脚本、文档与命令入口变更，无需单独服务部署。
- 合入主干后，后续任务默认通过根 `package.json` 中的治理入口获得新行为：
  - `pnpm lint:new-code:governance`
  - `pnpm lint:maintainability:guard`
  - `pnpm check:governance-backlog-ratchet`

## 用户/产品视角的验收步骤

1. 新建一个不符合 kebab-case 的源码文件，例如 `apps/demo/src/FooBar.ts`，确认 `pnpm lint:new-code:governance` 直接阻断。
2. 在 strict touched source 路径中修改一个历史 legacy 文件，例如 `apps/platform-admin/src/pages/LoginPage.tsx`，确认命名违规从 warning 升级为 error。
3. 在普通 legacy 路径中修改一个历史 legacy 文件，确认仍保持 warning，不会一口气炸全仓。
4. 新建一个不符合规则的文档文件，例如 `docs/plans/RuntimeControlPlan.md`，确认 docs 命名 diff gate 直接阻断。
5. 人为增加 tracked backlog 基线以外的命名债务，运行 `pnpm check:governance-backlog-ratchet`，确认会失败。

## 可维护性总结汇总

- 是否已尽最大努力优化可维护性：是。本次目标不是清理某一批具体业务文件，而是把历史债务治理从“靠人记得顺手改”升级为“有 contract、有 strict touched 范围、有 backlog ratchet”的默认机制。
- 是否优先遵循删减优先、简化优先、代码更少更好原则：是。没有新增新的大型治理框架，也没有引入数据库或额外配置层；复用现有 diff gate、报告脚本和命令入口，只补最小必要的 contract、docs helper 和 ratchet。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：本次文件数净增长，属于最小必要新增。增长来自 docs 命名治理与 backlog ratchet 的新脚本和测试；同步偿还的维护性债务是把“存量永远只是 warning”的机制缺口补上，并把 docs 命名首次纳入自动治理主链路。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适：更合适。治理契约、docs 命名共享逻辑、report/check 入口分离清晰，避免把所有逻辑继续堆进单一脚本。
- 目录结构与文件组织是否满足当前项目治理要求：基本满足。本次新增文件全部使用 kebab-case，并落在 `scripts/`、`docs/plans/`、`docs/logs/` 的既有职责目录下；`scripts/` 目录仍处于已记录豁免的扁平入口模式，本次未扩大该例外范围。
- 若本次涉及代码可维护性评估，是否基于独立于实现阶段的 `post-edit-maintainability-review`：是。结论为“通过，但保留明确后续扩围位点”。本次顺手减债：是。减掉的是“只有新增受约束、存量永远弱约束”的机制债。
- 长期目标对齐 / 可维护性推进：本次顺着“代码更少、规则更明确、治理更可预测”的长期方向推进了一小步。虽然没有直接减少历史违规文件数量，但已经把系统从“纯人工提醒”推进到“自动阻断新增 + 分批 strict touched + backlog 不反弹”的闭环。下一步最合理的推进位点，是继续扩大 strict touched governance 覆盖目录，并按 baseline 报告分批消化 `81 + 11` 的历史命名债务。
