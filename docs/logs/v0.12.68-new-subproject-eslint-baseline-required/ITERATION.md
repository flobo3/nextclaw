# ITERATION

## 迭代完成说明（改了什么）
- 在 `AGENTS.md` 的 `Project Rulebook` 新增规则：`new-subproject-eslint-baseline-required`。
- 新规则要求：新增子项目（`apps/*`、`packages/*`、`packages/extensions/*`、`workers/*`）时，若有可 lint 源码，必须在创建阶段同步配置 ESLint，并包含 `max-lines` 与 `max-lines-per-function` 规则，同时具备 `lint` 脚本。
- 目标是把“子项目起步即具备行数约束基线”前置为强制机制，避免后续补齐带来的治理成本和返工。

## 测试/验证/验收方式
- 文档结构校验：
  - 规则已追加在 `AGENTS.md` 的 `Project Rulebook` 区域，且遵循 Rulebook 模板字段（约束/示例/反例/执行方式/维护责任人）。
  - 迭代目录命名遵循 `v<semver>-<slug>`，本次为 `v0.12.68-new-subproject-eslint-baseline-required`。
- 本次为机制/文档更新，不涉及运行时代码行为改动；`build/lint/tsc` 对本次变更不构成有效信号，故标记为不适用。

## 发布/部署方式
- 本次仅更新项目规则与迭代文档，不涉及包发布、服务部署或数据库 migration。
- `release/deploy/migration`：不适用。

## 用户/产品视角的验收步骤
1. 打开 `AGENTS.md`，确认 `Project Rulebook` 中存在 `new-subproject-eslint-baseline-required` 条目。
2. 按规则模拟新建子项目清单检查：
   - 是否有 `lint` 脚本。
   - 是否有 ESLint 配置文件。
   - 是否包含 `max-lines` 与 `max-lines-per-function`。
3. 确认后续子项目接入流程按该规则执行，并在对应迭代日志记录检查结果。
