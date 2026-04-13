# v0.16.8 Provider Model Switch Default Fix

## 迭代完成说明

- 修复共享模型选择组件 [`ProviderScopedModelInput.tsx`](/Users/peiwang/Projects/nextbot/packages/nextclaw-ui/src/components/common/ProviderScopedModelInput.tsx) 在切换 provider 时会把当前值直接清空的问题。此前这会导致 UI 退回“选择提供商”占位，用户刚选中的 provider 立即丢失。
- 优化 provider 切换体验：当新 provider 已配置模型列表时，切换后会立即回填该 provider 的第一个可用模型，不再要求用户再额外点一次 model。
- 保留“无预置模型时仍可手输”的能力：当 provider 没有候选模型时，组件会保留 provider 选中态，并继续允许用户手动输入 model id。
- 补充模型页回归测试 [`ModelConfig.test.tsx`](/Users/peiwang/Projects/nextbot/packages/nextclaw-ui/src/components/config/ModelConfig.test.tsx)，覆盖：
  - 切换 provider 后不再退回占位，并自动带出默认模型。
  - 共享输入组件在无预置模型的 provider 上仍保持 provider 选中并允许手输。

## 测试 / 验证 / 验收方式

- 定向 UI 测试：
  - `pnpm -C packages/nextclaw-ui exec vitest run src/components/config/ModelConfig.test.tsx`
  - 结果：通过。
- 定向 lint：
  - `pnpm -C packages/nextclaw-ui exec eslint src/components/common/ProviderScopedModelInput.tsx src/components/config/ModelConfig.test.tsx`
  - 结果：通过。
- 类型检查：
  - `pnpm -C packages/nextclaw-ui exec tsc --noEmit`
  - 结果：通过。
- 构建验证：
  - `pnpm -C packages/nextclaw-ui build`
  - 结果：通过。
- 真实页面轻量冒烟（未点击保存，不改持久配置）：
  - 先在现网本地服务 `http://127.0.0.1:55667/model` 复现旧问题：2026-04-13 切换 `DashScope -> MiniMax` 后，provider 退回“选择提供商”，model 输入框被禁用。
  - 再用当前源码启动临时前端 `http://127.0.0.1:4174/model`（`VITE_API_BASE=http://127.0.0.1:55667 pnpm -C packages/nextclaw-ui exec vite --port 4174 --host 127.0.0.1`），同样切换 `DashScope -> MiniMax`。
  - 观察结果：provider 保持为 `MiniMax`，model 自动回填为 `MiniMax-M2.7`，符合预期。
- 维护性守卫：
  - `pnpm lint:maintainability:guard`
  - 结果：未通过。
  - 原因：命中的是工作区内其它并行改动的既有错误/新文件治理问题，不是本次触达文件引入的问题。
- 新代码治理：
  - `pnpm lint:new-code:governance`
  - 结果：未通过。
  - 原因：被其它并行改动中新命名文件阻断；本次触达文件仅出现 legacy kebab-case warning，没有新增本链路错误。

## 发布 / 部署方式

- 本次只修改前端源码与测试，未执行正式发布。
- 如需让本地运行中的 NextClaw 立即带上修复后的前端，可重建并替换 UI 产物，或按现有前端发布流程发布包含本次修复的新版本。
- 本次不涉及数据库、服务端配置或迁移步骤。

## 用户 / 产品视角的验收步骤

1. 打开模型配置页。
2. 在当前已有默认 provider / model 的前提下，把 provider 从一个已配置项切到另一个已配置项。
3. 确认 provider 不会再退回“选择提供商”占位。
4. 确认 model 输入框不会保持空白，而是自动带出该 provider 的第一个可用模型。
5. 若某 provider 没有预置模型，确认 provider 仍保持选中，且 model 输入框允许继续手输自定义 model id。
6. 不保存时刷新页面，确认不会改动已有持久配置；保存后再刷新，确认新 provider/model 能正确保留。

## 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。修复点继续收敛在共享组件里，没有去模型页或 Agent 弹窗分别补一层页面级兜底。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。方案直接删掉“切 provider 先清空、再等后续状态补救”的隐式路径，改为一条明确、可预测的即时决策路径。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：基本做到。未新增源代码文件；总代码净增主要来自回归测试，非测试代码仅净增 `+10` 行，属于最小必要增长。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：更清晰。provider 切换与 model 回填仍由共享输入组件自己负责，页面层不需要知道“切 provider 后该怎么补 model”。
- 目录结构与文件组织是否满足当前项目治理要求：本次未新增目录治理债务；仍沿用现有共享组件与页面测试位置。触达文件名仍有 legacy kebab-case warning，但本次没有新增文件或扩大目录平铺度。
- 基于独立于实现阶段的 `post-edit-maintainability-review` 复核结论如下：
  - 可维护性复核结论：通过
  - 本次顺手减债：是
  - 长期目标对齐 / 可维护性推进：
    - 这次改动顺着“统一体验优先、行为可预测”的方向前进了一小步，把 provider/model 切换从 surprise failure 收敛成稳定、即时的反馈。
    - 顺手推进的减债点，是把“切 provider 后如何稳定决定 model”留在共享 owner 内，不再向页面层扩散状态修补逻辑。
  - 代码增减报告：
    - 新增：120 行
    - 删除：4 行
    - 净增：+116 行
  - 非测试代码增减报告：
    - 新增：12 行
    - 删除：2 行
    - 净增：+10 行
  - no maintainability findings
  - 可维护性总结：
    - 这次修改没有引入新的抽象层，只把原来错误的清空路径改成了单一路径选择，源码增长被压到很小。
    - 主要增长来自回归测试，这符合“用户可见交互回归要被钉住”的最小必要成本。
    - 后续观察点是共享组件文件名仍属历史 legacy 命名，等相关区域有统一重命名窗口时再一起收敛。
