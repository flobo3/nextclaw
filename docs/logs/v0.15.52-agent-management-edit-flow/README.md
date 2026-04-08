# v0.15.52 Agent 管理编辑与模型选择复用

## 迭代完成说明

- 为前端 `/agents` 页面补齐了 Agent 编辑能力，用户现在可以在 Agent 管理页直接修改已有 Agent 的名称、描述、头像、模型与运行时。
- 新增前端弹窗组件 [`AgentDialogs.tsx`](../../../packages/nextclaw-ui/src/components/agents/AgentDialogs.tsx)，把创建/编辑表单从 [`AgentsPage.tsx`](../../../packages/nextclaw-ui/src/components/agents/AgentsPage.tsx) 中抽离出来，避免页面继续膨胀。
- 后端补齐 `PUT /api/agents/:agentId` 更新链路，把 UI 编辑能力正式接到现有 `updateAgentProfile` 上：
  - [`agents.controller.ts`](../../../packages/nextclaw-server/src/ui/ui-routes/agents.controller.ts)
  - [`agents.ts`](../../../packages/nextclaw-server/src/ui/agents.ts)
- Agent create / update 的 request、response 与 core profile 输入统一支持 `model` 字段，新增与编辑都可以修改模型。
- 将“先选 provider，再下拉搜索/手输 model id”的纯交互能力抽成共享组件 [`ProviderScopedModelInput.tsx`](../../../packages/nextclaw-ui/src/components/common/ProviderScopedModelInput.tsx)，并同时复用到：
  - Agent 创建/编辑弹窗
  - 模型设置页 [`ModelConfig.tsx`](../../../packages/nextclaw-ui/src/components/config/ModelConfig.tsx)
- 为了避免 [`agent-profiles.ts`](../../../packages/nextclaw-core/src/config/agent-profiles.ts) 继续堆字段归一化细节，本轮把 `model/runtime` patch 组装下沉到 [`agent-profile-runtime-fields.ts`](../../../packages/nextclaw-core/src/config/agent-profile-runtime-fields.ts)。
- 本次最小实现方案记录见 [`2026-04-08-agent-management-edit-design.md`](../../plans/2026-04-08-agent-management-edit-design.md)。

## 测试/验证/验收方式

- Core Agent profile 测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core test src/config/agent-profiles.test.ts`
  - 结果：通过。
- Server Agent 路由测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server test router.agents.test.ts`
  - 结果：通过。
- UI 页面测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui test src/components/agents/AgentsPage.test.tsx src/components/config/ModelConfig.test.tsx`
  - 结果：通过。
- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
  - 结果：通过。
- 定向构建：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server build`
  - 结果：通过。
- 可维护性守卫：
  - `PATH=/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard`
  - 结果：未通过。
  - 说明：本轮相关的守卫 error 已清掉，当前唯一剩余 error 是工作区并行改动触发的 [`i18n.ts`](../../../packages/nextclaw-ui/src/lib/i18n.ts) 文件预算问题；其余均为历史热点或目录预算 warning。本轮已顺手消掉 `agent-profiles.test.ts` 顶层超长测试块，并把 `agent-profiles.ts` 的字段归一化重复逻辑下沉。

## 发布/部署方式

- 本次未执行发布或部署。
- 若后续随前端版本发布，只需按现有 UI / server 发布流程打包即可。
- 本次不涉及数据库变更、远程 migration 或额外环境变量。

## 用户/产品视角的验收步骤

1. 启动当前 NextClaw UI，进入 `/agents` 页面。
2. 确认每个 Agent 卡片都可见“编辑”按钮。
3. 点击任一 Agent 的“编辑”，确认弹窗打开后能正确回填名称、描述、头像、模型与运行时。
4. 在模型区域先选择 provider，再从下拉列表挑选模型；随后直接手输一个未在候选中的 model id，确认输入仍可保存。
5. 保存后确认 Agent 卡片内容立即刷新，并保留最新模型与运行时。
6. 再点击“新增 Agent”，确认新增弹窗中的模型区域也复用同样的 provider + 搜索/手输交互。
7. 进入模型设置页，确认该页复用同一套模型输入组件，而不是另一套分叉交互。

## 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是，在不扩大并行工作区风险的前提下，已经把这条链路里最明显的两处膨胀点顺手收了一步。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：是。没有复制模型选择逻辑，也没有在 Agent 表单里另起一套实现，而是把已有交互抽成共享纯 UI 组件双向复用。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：总代码量净增，但增长集中在新增编辑能力和共享模型输入组件本身；同时通过抽出 [`AgentDialogs.tsx`](../../../packages/nextclaw-ui/src/components/agents/AgentDialogs.tsx) 与 [`ProviderScopedModelInput.tsx`](../../../packages/nextclaw-ui/src/components/common/ProviderScopedModelInput.tsx) 避免了把复杂度继续压回已有热点文件。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：更清晰。页面仍负责 orchestration，弹窗负责表单 UI，模型输入组件只负责纯交互，core helper 负责 `model/runtime` patch 归一化。
- 目录结构与文件组织是否满足当前项目治理要求：基本满足。本次新增文件都落在现有职责目录下，但 [`packages/nextclaw-server/src/ui/config.ts`](../../../packages/nextclaw-server/src/ui/config.ts) 等历史热点仍未在本轮被处理。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：是。
  - 可维护性复核结论：保留债务经说明接受
  - 本次顺手减债：是
  - 长期目标对齐 / 可维护性推进：
    - 这次改动顺着“统一体验优先”的方向前进了一步，让 Agent 管理和全局模型设置共享同一套模型选择心智，而不是继续制造不同入口、不同交互。
    - 这次顺手推进的最小维护性改进，是把模型选择交互与 `model/runtime` patch 归一化从热点文件里抽出来，避免后续继续补丁式生长。
  - 代码增减报告：
    - 新增：1035 行
    - 删除：225 行
    - 净增：+810 行
  - 非测试代码增减报告：
    - 新增：718 行
    - 删除：221 行
    - 净增：+497 行
  - 可维护性总结：这次能力补齐带来了必要的新代码，但新增逻辑主要落在共享组件和清晰边界上，而不是继续把判断塞回页面或大热点文件。剩余维护性压力主要来自工作区其它并行链路和少数历史热点，本轮已把自己新增的结构收敛到相对可持续的形态。

## 红区触达与减债记录

### packages/nextclaw-server/src/ui/config.ts

- 本次是否减债：否
- 说明：当前工作区同批改动触达了该热点文件；这次 Agent 编辑与模型输入复用本身没有继续向这里叠加新的页面业务编排，但守卫仍要求记录该热点现状。
- 下一步拆分缝：先按 chat/session/provider 三个域拆分配置构建与默认值归一化，再把会话与模型相关的 patch/映射逻辑继续下沉。
