# v0.15.40-file-directory-basename-collision-guard

## 迭代完成说明

- 新增 ESLint 自定义规则 `nextclaw/no-file-directory-basename-collision`，禁止同级同时出现 `xxx.ts/tsx/js` 与 `xxx/` 这类基名冲突结构。
- 新增 `scripts/lint-new-code-file-directory-collisions.mjs`，把同一条治理语义接入 `pnpm lint:new-code:governance`，确保维护性门槛在 diff-only 守卫里也能阻断新增冲突。
- 将 `scripts/` 一并纳入根 ESLint 匹配与增量治理采集范围，避免治理机制只覆盖 `apps/packages/workers` 而在仓库根脚本层留下后门。
- 将当前仓库 10 处历史冲突收敛为一份集中豁免名单，只允许历史债务显式存在，不允许继续新增同类目录结构债务。
- 补齐规则与增量守卫的单元测试，覆盖命中、未命中和豁免三种场景。

## 测试/验证/验收方式

- `node --test scripts/eslint-rules/no-file-directory-basename-collision-rule.test.mjs scripts/lint-new-code-file-directory-collisions.test.mjs`
- `pnpm exec eslint eslint.config.mjs scripts/file-directory-basename-collision-shared.mjs scripts/eslint-rules/no-file-directory-basename-collision-rule.mjs scripts/lint-new-code-file-directory-collisions.mjs`
- `node scripts/lint-new-code-file-directory-collisions.mjs -- scripts`
- `pnpm lint:new-code:governance -- --help`
- `pnpm lint:new-code:governance`
  - 当前工作区存在用户自己的未完成改动，最终验证以“治理脚本与本次新增测试通过、守卫生效”为准。

## 发布/部署方式

- 不适用。本次仅修改本地开发治理与 lint 规则，无独立发布或部署动作。

## 用户/产品视角的验收步骤

1. 在任一受管目录下新建 `foo.ts` 与同级目录 `foo/`。
2. 运行目标包 `eslint` 或仓库根部 `pnpm lint:new-code:governance`。
3. 确认命令报错，提示该文件与同级目录存在基名冲突，要求重命名其中一侧。
4. 删除冲突或改名后重新执行，确认错误消失。

## 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。目标是把目录命名歧义从“人为约定”提升成“机械约束”，并且没有为了快速落地再复制一套单独规则语义。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。没有引入第二套规则解释，而是抽出一份共享检测逻辑，ESLint 与增量守卫共用，避免同一判断在两处漂移。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：目录债务没有继续恶化。总代码量有小幅净增，但属于新增治理能力的最小必要增量；同时把“历史冲突点分散隐性存在”的维护债务收敛成一份显式名单，降低后续清理成本。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：更清晰。共享模块只承载“文件与目录基名冲突”这一件事，没有引入额外层级或通用过度抽象。
- 目录结构与文件组织是否满足当前项目治理要求：本次新增文件都落在现有 `scripts/` 与 `scripts/eslint-rules/` 体系内，符合当前治理要求。历史 10 处冲突仍未清理，但已被显式登记为 grandfathered debt，后续可逐项移除豁免。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：是。本次独立复核结论为“通过”；未发现为了兜底而复制逻辑或把复杂度转移到新入口的问题，唯一保留债务是历史豁免名单仍有 10 条，下一步应结合相关模块重构逐项消除。
