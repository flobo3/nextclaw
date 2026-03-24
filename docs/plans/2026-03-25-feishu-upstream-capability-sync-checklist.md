# NextClaw Feishu Upstream Capability Sync Checklist v1

## Purpose

This checklist turns the Feishu upstream adoption strategy into an operational migration board.

Companion document:

- [2026-03-25-feishu-upstream-sync-implementation-plan.md](./2026-03-25-feishu-upstream-sync-implementation-plan.md)

Judgment baseline:

- upstream reference: `larksuite/openclaw-lark`
- product baseline date: `2026-03-25`
- default policy: high-value upstream capability is in-scope unless there is a clear reason to reject it

## How to Read

- `可直接 copy`: vendor/copy first, keep structure reasonably close to upstream, then type/test/adapt minimally
- `需薄改`: preserve core logic but rewrite the narrow NextClaw boundary
- `不建议迁移`: reference behavior only, or reject because value is weak or coupling/pollution is too high

## Three-Column Migration Checklist

| 可直接 copy | 需薄改 | 不建议迁移 |
| --- | --- | --- |
| **Feishu OAPI tool bodies**: `doc`, `wiki`, `drive`, `bitable/base`, `chat`, `sheets`, `calendar`, `task` 的 API 调用、参数归一化、结果格式化、分页与错误整形逻辑。 | **OAuth / identity boundary**: OAuth 入口、授权回调对接、token store、UAT/TAT 选择、scope guard、bot 身份与用户身份切换。核心逻辑保留，入口与上下文注入改写到 NextClaw。 | **OpenClaw plugin lifecycle 壳层**: 直接绑定 OpenClaw 插件注册、生命周期启动、内部 runtime contract 的整块实现。 |
| **Feishu schema and config logic**: client config、account merge、domain/brand 解析、cross-field 校验、工具开关 schema。 | **Tool registration shell**: 将 upstream 的工具主体接到 NextClaw 的 `registerTool`、运行时上下文、agent account 路由上。 | **OpenClaw product-shell onboarding**: 只服务 OpenClaw 产品壳层的向导、CLI 交互、诊断命令、特定安装流。 |
| **Message/domain converters**: rich text、post、image、file、audio、interactive、calendar/todo message converter 等纯内容转换逻辑。 | **Reply dispatcher / card action bridge**: 卡片交互、确认按钮、reply dispatch、interactive approval 等保留核心策略，但改写事件桥接与运行时入口。 | **一次性兼容补丁**: 只为某个 OpenClaw 历史 bug、安装器缺陷、日志特征或旧版本事故服务的特判代码。 |
| **Feishu work-surface CRUD slices**: 文档块操作、表格/字段/记录 CRUD、日历事件 CRUD、任务 CRUD、sheet 单元格和工作表操作。 | **Account and identity routing**: 默认账户、显式 `accountId` 覆盖、authorized user context、multi-tenant / multi-account 选择器。 | **隐藏 fallback 行为**: 静默从用户身份降级到 bot 身份、静默切到另一个账户、依赖环境状态制造 surprise success 的逻辑。 |
| **Permission/scopes diagnostics**: app scope 列表、权限错误提取、grant URL 整理、scope 缺失结果格式化。 | **Server/runtime host integration**: OAuth 状态存储、回调端点、凭据注入、服务端 session 管理、前端配置页联动。 | **低价值边角能力**: 高频工作流贡献弱、维护重、跨平台复用价值低的单点能力。需要单独论证后才允许进入范围。 |
| **Reusable Feishu client primitives**: SDK client 创建、token 请求封装、header 注入、brand/domain 切换、请求超时和基础错误包装。 | **Security policy surface**: 把 upstream 安全策略映射为 NextClaw 的显式配置、审计提示、风险模型和默认值。 | **污染通用抽象的飞书特化模型**: 一旦会把 NextClaw 的上层能力模型永久锁死在飞书产品命名上，就不直接迁移。 |
| **Tests for pure capability logic**: 参数转换、结果格式化、分页、字段映射、scope 错误解析、内容转换等测试样例。 | **UI/config projection**: 将新增能力暴露到 NextClaw UI、schema metadata、action schema、帮助文档。 | **重复实现**: 当前 NextClaw 已有且结构更清晰的能力，不再为了“保持上游同形”重复落一套。 |

## Current Priority Queue

### P0: Existing Surface Stabilization

- message ingress/egress
- media
- streaming
- chat
- doc
- wiki
- drive
- bitable
- scopes/perm

### P1: Mandatory New Work-Surface Parity

- sheets
- calendar
- task

### P2: Mandatory Identity Parity

- OAuth
- authorized-user execution
- user-token routing
- bot/user identity model
- scope-aware failure and audit behavior

### P3: Continuous Upstream Sync

- interactive cards refinements
- reply/approval UX
- additional high-value upstream work-surface slices

## Initial Rejection Rules

An upstream slice should remain in `不建议迁移` only when at least one of the following is true:

1. it is mostly OpenClaw shell code
2. it would introduce hidden behavior or identity ambiguity
3. it creates poor long-term ROI relative to user value
4. it duplicates a better existing NextClaw implementation

If none of the above are true, the default destination is `可直接 copy` or `需薄改`, not rejection.

## Maintenance Rule

Whenever we review upstream changes, update this checklist in the same pass:

- move newly understood items into one of the three columns
- mark items that have already landed in NextClaw
- note any item whose bucket changed because the architecture boundary changed
