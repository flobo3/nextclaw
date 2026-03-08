# v0.12.51-docs-provider-options-minimax-step-by-step

## 迭代完成说明（改了什么）

- 在“安装后第一步：先选接入方式”文档中，将 `API Key（MiniMax 示例）` 从概述升级为可执行的 step-by-step。
- 新增并明确了 MiniMax 的操作地址与顺序：
  - 登录页（全球/中国区）
  - API Key 页面（全球/中国区）
  - NextClaw 内填写 `API Key` / `API Base`
  - 测试连接、保存、模型选择与对话验证
- 保持文档主旨不变：MiniMax 仅示例，不是唯一选项或强绑定。
- 同步更新中英文镜像页：
  - `apps/docs/zh/guide/tutorials/provider-options.md`
  - `apps/docs/en/guide/tutorials/provider-options.md`

## 测试/验证/验收方式

- 文档双语镜像校验：`pnpm docs:i18n:check`
- 文档构建验证：`pnpm --filter @nextclaw/docs build`
- 验收点：
  - 中英文页面均包含 MiniMax 的逐步操作步骤；
  - 包含登录/API Key 页面地址与 NextClaw 填写动作；
  - 文档不再表达“第一步必须 MiniMax”。

## 发布/部署方式

- docs-only 变更，合并后执行：`pnpm deploy:docs`
- 不涉及后端、数据库、migration 与服务发布。

## 用户/产品视角的验收步骤

1. 用户打开“安装后第一步：先选接入方式”页面。
2. 先看到两条路径（Qwen Portal / API Key）及取舍。
3. 选择 API Key 路径后，按 MiniMax step-by-step 完成登录、创建 key、回填配置。
4. 在 NextClaw 中点击测试连接并保存，随后发出验证消息。
5. 收到预期回复后，继续下一步文档（配置后做什么/渠道接入）。
