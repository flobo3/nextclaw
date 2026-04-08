# Agent Management Edit Design

## 背景

当前前端 `Agent` 管理页已支持列表展示、创建与删除，但缺少对既有 Agent 的编辑入口。结果是用户只能在 UI 中“看见 Agent”，却不能在同一管理空间内完成常见的身份维护动作，统一体验被中断。

## 目标

- 在前端 `Agent` 管理页补齐编辑能力。
- 保持现有页面视觉与交互语义连续，不引入新的管理入口或额外页面。
- 仅开放当前后端与运行时能够稳定支持的字段编辑，避免 UI 先承诺、后端再兜底。
- 将模型选择能力收敛为可复用的纯 UI 交互组件，供模型设置页与 Agent 管理页共享。

## 范围与边界

- 本次支持编辑：`displayName`、`description`、`avatar`、`model`、`runtime`
- 本次不支持编辑：`id`、`workspace/home`
- `workspace/home` 继续在卡片内展示，并在编辑弹窗中只读提示，避免用户误以为可以安全迁移 Agent 主目录
- 内建 `main` Agent 允许编辑其可覆盖字段；自定义 Agent 同样允许编辑

## 方案选择

推荐方案：沿用现有 `AgentsPage` 的卡片 + 弹窗模式，新增“编辑 Agent”动作与对应更新接口；模型输入复用统一的 provider-scoped 模型字段组件。

选择理由：

- 改动链路最短：`server route -> ui api -> react-query hook -> AgentsPage dialog`
- 与现有“新增 Agent”体验一致，学习成本最低
- 模型输入不复制 `ModelConfig` 页面逻辑，而是抽出共享纯 UI 组件，避免两个页面后续语义漂移
- 不新增页面、不新增状态容器，避免为一个局部能力提前膨胀结构
- 后端底层已具备 `updateAgentProfile`，只需把 UI API 补齐即可

## 数据流

1. 用户在 Agent 卡片点击“编辑”
2. 页面把当前 Agent 信息注入编辑表单
3. 前端调用 `PUT /api/agents/:agentId`
4. 服务端通过 `updateAgentProfile` 写回配置
5. 成功后失效 `agents` 与 `config` 查询，页面自动刷新最新状态

## 错误与可预测性

- 表单只提交本次可编辑字段，不伪装支持 `home` 更新
- 空字符串遵循现有 `updateAgentProfile` 语义，可用于清空可选字段
- 失败时复用现有 toast 错误反馈

## 测试

- Server route test: 新增更新成功用例，覆盖自定义 Agent 与 `main` 覆盖写入
- UI test: 校验编辑动作可见，避免中文文案回退，核心入口仍保持可用

## 长期目标对齐 / 可维护性推进

- 这次改动是在增强 NextClaw 作为统一入口的管理闭环，让用户在同一前端空间完成 Agent 身份维护，而不是把常规管理动作推回 CLI
- 优先选择少新增层级、少新增状态的方案，避免为局部交互引入新的 presenter/store/manager
- 本次顺手推进点：把 Agent 管理从“只读 + 局部创建”推进到“统一管理闭环”，同时坚持只暴露稳定支持的字段，减少未来 UI/后端语义漂移
