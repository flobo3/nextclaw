# 2026-04-08 Param Mutation Governance Plan

## 背景

当前仓库已经有一套“新改动 diff-only 治理”主链路，能够阻断 touched class 方法形态、closure object owner 缺失、顶层 stateful orchestrator owner 缺失等问题，但仍缺一条关键边界：普通函数对入参对象的原地 mutation 没有硬闸门。

这会造成两类长期风险：

- 工具函数与业务 owner 边界混杂，函数表面看似 helper，实际在偷偷改调用方状态
- 调用时序成为隐式契约，代码阅读者无法只看签名理解副作用

这类问题不利于 NextClaw 作为统一入口产品的长期演进，因为统一体验不仅依赖功能可用，还依赖底层行为可预测、职责边界清晰、编排逻辑可持续扩展。

## 长期目标对齐 / 可维护性推进

- 这次改动顺着“代码更少、架构更简单、边界更清晰、复用更通用、复杂点更少”的方向推进一小步：把原本依赖人工 code review 直觉的问题，转成明确的 owner / pure-function 边界治理。
- 本次优先推进的最小维护性改进是：阻断新增普通函数入参 mutation，而不是先批量重构存量业务代码，避免把历史债和新债混在一起。
- 若后续仍发现 class owner 中也出现不合理的入参 mutation，再在下一轮治理中继续收紧，不在本次先引入过宽规则造成噪音。

## 目标与范围

本次只做治理落地，不批量修改业务实现。

纳入范围：

- 新增一条通用规则，明确普通函数的输入输出边界
- 新增 diff-only AST 检查，阻断 touched ordinary function 的高置信度入参 mutation
- 接入 `pnpm lint:new-code:governance`
- 补测试、验证说明和迭代留痕

不纳入范围：

- 不全仓把 `no-param-reassign` 直接切成 `error`
- 不批量重构现有业务函数
- 不在本次同时治理“alias 后再 mutation”这类更复杂的别名逃逸问题

## 方案

推荐方案：沿用现有 `lint-new-code-*` 增量治理框架，新增 `scripts/lint-new-code-param-mutations.mjs`。

原因：

- 能复用现有 diff-only 机制，不把历史代码一次性全部打爆
- 报错信息可以直接贴合仓库规则语言，明确推荐“pure return/patch”或“class owner”
- 和现有 class / closure / orchestrator 治理互补，形成更完整的 owner 边界

暂不采用的方案：

- 直接把 ESLint `no-param-reassign` 改成全仓 `props: true`
  - 问题：噪音过大，且无法表达本仓库偏好的修法路径
- 只靠 maintainability review 人工提醒
  - 问题：不具备阻断能力，容易回退成“看到一次说一次”

## 检查边界

首版只拦高置信度 mutation：

- `param.x = ...`
- `delete param.x`
- `Object.assign(param, ...)`
- `param.push()` / `param.splice()` / `param.set()` / `param.add()` / `param.clear()` 等典型 mutator call

首版默认豁免：

- class 方法与 class field 方法
- 未触达函数
- alias 后再 mutation 的间接写法

## 验证

- 单测覆盖 touched / untouched / class 豁免 / mutator call
- 定向运行新脚本与聚合治理入口
- 定向运行 maintainability guard
- 补一轮独立 maintainability review，确认这不是“新增一层治理而不减少真实复杂度”
