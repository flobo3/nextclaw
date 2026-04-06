# v0.15.27-new-code-context-destructuring-gate

## 迭代完成说明

- 新增 [`scripts/lint-new-code-context-destructuring.mjs`](../../../scripts/lint-new-code-context-destructuring.mjs)，把原本仅以 ESLint `warn` 形式存在的 `params/options/context` 顶层解构治理，收紧为“只对本次变更触达函数阻塞”的 diff-only 检查。
- 规则行为保持和现有 ESLint 治理一致：
  - 只检查 `params` / `options` / `context` 这类上下文对象
  - 只在同一触达函数内重复读取达到 `4` 次及以上时失败
  - 不把历史未触达代码一并升级成全仓库 error
- 在 [`scripts/lint-new-code-governance.mjs`](../../../scripts/lint-new-code-governance.mjs) 中接入新的 `context-destructuring` 检查，使其进入 `pnpm lint:new-code:governance` 主链路。
- 在 [`package.json`](../../../package.json) 中补充 `lint:new-code:context-destructuring` 脚本，便于单独执行和排查。
- 新增 [`scripts/lint-new-code-context-destructuring.test.mjs`](../../../scripts/lint-new-code-context-destructuring.test.mjs)，覆盖：
  - 触达函数命中重复读取
  - 同文件未触达函数不受影响
  - 已做顶层解构通过
  - 低于阈值不报错

## 测试/验证/验收方式

- 单测：
  - `node --test scripts/lint-new-code-context-destructuring.test.mjs`
- 定向 lint：
  - `pnpm eslint scripts/lint-new-code-context-destructuring.mjs scripts/lint-new-code-context-destructuring.test.mjs scripts/lint-new-code-governance.mjs`
- 真实命中验证：
  - `node scripts/lint-new-code-context-destructuring.mjs -- packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-context-builder.ts`
  - 结果：按预期非零退出，并报出 `resolveAgentProfile` 对 `params.*` 的 `12` 次重复读取
- 可维护性守卫：
  - `node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths package.json scripts/lint-new-code-context-destructuring.mjs scripts/lint-new-code-context-destructuring.test.mjs scripts/lint-new-code-governance.mjs`
  - 结果：`Errors: 0`，存在 1 条既有目录预算 warning：`scripts` 目录超预算但已有豁免说明
- 未执行项：
  - `build`：不适用。本次只改根仓库治理脚本与测试，未触达产物构建链路
  - `tsc`：不适用。本次新增的是根目录 `.mjs` 脚本和测试，不属于 TypeScript 编译产物
  - 全量 `pnpm lint:maintainability:guard`：本工作区存在大量并行中的业务改动，为避免把不相关 diff 混入结果，本次改为按触达路径执行定向守卫

## 发布/部署方式

- 本次改动属于仓库内开发治理增强，无独立部署、发版、migration 或线上发布步骤。
- 合入后，后续所有运行 `pnpm lint:new-code:governance` 或 `pnpm lint:maintainability:guard` 的开发收尾流程，都会对新增触达函数执行上下文解构阻塞检查。

## 用户/产品视角的验收步骤

1. 打开 [`scripts/lint-new-code-context-destructuring.mjs`](../../../scripts/lint-new-code-context-destructuring.mjs)，确认它只检查 diff 触达函数，而不是全量扫描所有历史函数。
2. 打开 [`scripts/lint-new-code-governance.mjs`](../../../scripts/lint-new-code-governance.mjs)，确认 `context-destructuring` 已接入主治理链路。
3. 在一个已修改的项目文件里保留类似 `params.a + params.b + params.c + params.d` 的写法，运行 `pnpm lint:new-code:context-destructuring -- <path>`，确认会直接失败。
4. 在同一个函数里改为先 `const { a, b, c, d } = params;` 再使用，重新运行同一命令，确认检查通过。

## 可维护性总结汇总

- 可维护性复核结论：通过
- 本次顺手减债：是
- no maintainability findings
- 可维护性总结：这次改动没有再造第二套治理体系，而是复用现有 diff-only 新代码治理框架，把“上下文解构”从软提示收紧成了仅对新增改动阻塞的硬门槛。代码量有小幅增长，但属于非功能改动下的最小必要增长，换来的是对新代码更清晰、更可执行、且不被历史债务拖累的治理闭环。
- 本次是否已尽最大努力优化可维护性：是。相比把 ESLint 全仓库从 `warn` 改成 `error`，当前方案更精确，也更符合“新代码更严格、旧代码渐进治理”的目标。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。此次没有新增独立配置入口、没有引入第二份规则定义，只是在现有 `lint:new-code:governance` 聚合脚本中增加一个检查项，并复用原有 diff 分析支持能力。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：仓库新增了 2 个脚本文件，属于把人工 code review 判断固化成自动阻塞的最小必要增长；同时避免了把所有历史 warning 一次性升级为 error 所带来的治理噪音，偿还的是“新代码沿用旧写法却只能靠人工提醒”的维护性债务。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。新增逻辑继续留在现有 `scripts/` 治理层，职责边界明确为“增量检查脚本 + 单测 + 聚合入口接线”，没有把规则逻辑散落进业务包，也没有引入新的跨层抽象。
- 目录结构与文件组织是否满足当前项目治理要求：基本满足。本次触达的 `scripts/` 目录存在既有目录预算 warning，但仓库已记录目录豁免，且本次新增文件继续属于同一治理职责域；后续若脚本继续增长，应按现有豁免提示寻找按责任拆分的缝。
