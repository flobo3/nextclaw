# v0.12.54-docs-provider-options-topup-step

## 迭代完成说明（改了什么）

- 在 `provider-options` 文档的 MiniMax API Key 路径中新增“充值并确认余额”步骤（中英文同步）。
- 将后续步骤顺序统一后移（Step 4~8），保证流程连续可执行。
- 在“常见错误对照”新增余额不足场景：`402 / insufficient_balance`，明确先充值再重试。

变更文件：
- `apps/docs/zh/guide/tutorials/provider-options.md`
- `apps/docs/en/guide/tutorials/provider-options.md`

## 测试/验证/验收方式

- 文档双语镜像校验：`pnpm docs:i18n:check`
- 文档构建验证：`pnpm --filter @nextclaw/docs build`
- 重点验收：
  - MiniMax 路径包含“创建 key -> 充值/余额确认 -> 回填配置 -> 测试连接 -> 对话验证”完整闭环。

## 发布/部署方式

- docs-only 变更，合并后执行：`pnpm deploy:docs`
- 不涉及后端、数据库、migration 与服务部署。

## 用户/产品视角的验收步骤

1. 打开“安装后第一步：选择模型接入方式”页面。
2. 进入 API Key（MiniMax 示例）路径，按步骤完成 key 创建与充值。
3. 在 NextClaw 中完成 Provider 测试连接与保存。
4. 发送验证消息并收到预期回复。
