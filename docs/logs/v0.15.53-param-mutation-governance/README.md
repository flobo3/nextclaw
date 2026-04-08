# v0.15.53-param-mutation-governance

## 迭代完成说明

- 新增 [`scripts/lint-new-code-param-mutations.mjs`](../../../scripts/lint-new-code-param-mutations.mjs)，把“普通函数不得原地修改入参”的边界收成 diff-only AST 检查：
  - 只检查本次触达的普通函数
  - 默认阻断高置信度 mutation：属性赋值、`delete`、`Object.assign(target, ...)`、以及 `push/splice/set/add/clear` 等典型 mutator call
  - 默认不把 class 方法一起纳入，避免把“ordinary function 边界治理”和“owner class 内部实现审查”混成一条噪音规则
- 在 [`scripts/lint-new-code-governance.mjs`](../../../scripts/lint-new-code-governance.mjs) 中接入 `param-mutations-owner-boundary` 检查，并在 [`package.json`](../../../package.json) 中补充 `lint:new-code:param-mutations` 入口。
- 新增 [`scripts/lint-new-code-param-mutations.test.mjs`](../../../scripts/lint-new-code-param-mutations.test.mjs)，覆盖：
  - touched ordinary function 命中属性写入与 `delete`
  - 同文件 untouched function 不受影响
  - class 方法与 class field 方法默认豁免
  - 典型 mutator call 与 `Object.assign()` 命中
- 在 [`AGENTS.md`](../../../AGENTS.md) 补充通用规则 `ordinary-function-no-input-mutation`，并同步更新 [`commands/commands.md`](../../../commands/commands.md) 与 [`.agents/skills/post-edit-maintainability-guard/SKILL.md`](../../../.agents/skills/post-edit-maintainability-guard/SKILL.md) 中的验证/收尾说明。
- 额外沉淀设计文档 [`2026-04-08-param-mutation-governance-plan.md`](../../../docs/plans/2026-04-08-param-mutation-governance-plan.md)，记录治理边界、首版范围和后续扩展位点。

## 测试/验证/验收方式

- 单测：
  - `node --test scripts/lint-new-code-param-mutations.test.mjs`
- 定向 lint：
  - `pnpm eslint scripts/lint-new-code-param-mutations.mjs scripts/lint-new-code-param-mutations.test.mjs scripts/lint-new-code-governance.mjs`
- 定向治理入口：
  - `pnpm lint:new-code:param-mutations -- scripts/lint-new-code-param-mutations.mjs`
  - `pnpm lint:new-code:governance -- scripts/lint-new-code-param-mutations.mjs scripts/lint-new-code-param-mutations.test.mjs scripts/lint-new-code-governance.mjs`
- 可维护性守卫：
  - `node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths package.json AGENTS.md commands/commands.md .agents/skills/post-edit-maintainability-guard/SKILL.md scripts/lint-new-code-param-mutations.mjs scripts/lint-new-code-param-mutations.test.mjs scripts/lint-new-code-governance.mjs docs/plans/2026-04-08-param-mutation-governance-plan.md docs/logs/v0.15.53-param-mutation-governance/README.md`
- 未执行项：
  - `build`：不适用。本次只改仓库治理脚本、规则与文档，未触达构建产物链路
  - `tsc`：不适用。本次新增的是根目录 `.mjs` 脚本和文档，不属于 TypeScript 编译产物
  - 全量 `pnpm lint:maintainability:guard`：当前工作区存在大量并行业务改动，为避免把不相关 diff 混入结果，本次改为按触达路径执行定向守卫

## 发布/部署方式

- 本次改动属于仓库内开发治理增强，无独立部署、发版、migration 或线上发布步骤。
- 合入后，后续所有运行 `pnpm lint:new-code:governance` 或 `pnpm lint:maintainability:guard` 的开发收尾流程，都会对新增普通函数入参 mutation 执行阻塞检查。

## 用户/产品视角的验收步骤

1. 打开 [`scripts/lint-new-code-param-mutations.mjs`](../../../scripts/lint-new-code-param-mutations.mjs)，确认它只检查 diff 触达函数，而不是全量扫描所有历史函数。
2. 打开 [`AGENTS.md`](../../../AGENTS.md)，确认 `ordinary-function-no-input-mutation` 已明确要求“普通函数返回新值/patch”或“提升为 owner class”。
3. 在一个已修改的项目文件里保留类似 `profile.avatar = x`、`delete profile.avatar`、`items.push(x)` 的普通函数写法，运行 `pnpm lint:new-code:param-mutations -- <path>`，确认会直接失败。
4. 将同一段逻辑改成返回 patch，或提升为 class owner 后，重新运行同一命令，确认检查通过。

## 可维护性总结汇总

- 可维护性复核结论：通过
- 本次顺手减债：是
- no maintainability findings
- 可维护性总结：这次改动把“普通函数偷偷改入参”从人工体感问题收成了可执行的 diff-only 闸门，没有再引入第二套治理框架，而是复用现有新代码治理主链路。代码量有净增长，但属于把高频 review 争议固化为统一边界的最小必要增长。
- 本次是否已尽最大努力优化可维护性：是。本次优先复用既有 `lint-new-code-*` 架构，没有另起一套 ESLint 插件或独立配置体系。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。没有把规则拆成多处重复定义，而是只增加一个 diff-only 检查脚本、一个测试文件和最小必要的文档接线。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：仓库新增了 2 个脚本文件和 2 个文档文件，属于将人工 code review 判断固化成自动阻塞所需的最小必要增长；同步偿还的是“新代码仍可用 helper 伪装 owner mutation，只能靠人工提醒”的维护性债务。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。新逻辑继续留在现有治理层，职责边界明确为“规则声明 + diff-only 检查 + 测试 + 聚合入口接线”，没有把治理逻辑散进业务包，也没有新增一层抽象壳。
- 目录结构与文件组织是否满足当前项目治理要求：基本满足。本次新增文件继续位于既有 `scripts/` 和 `docs/` 职责域中；`scripts/` 目录存在既有预算压力，但仓库已有豁免说明，本次未引入新的错层目录。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：已执行独立复核，结论为 `通过`，`no maintainability findings`。保留的后续扩展点是“alias 后再 mutation”的更深一层检查，但本次刻意未一起纳入，以避免在首版把规则做成高噪音大网。
