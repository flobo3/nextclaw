# v0.12.56-docs-provider-options-navigation-path-fix

## 迭代完成说明（改了什么）

- 修正 `provider-options` 文档中 MiniMax 路径的 Step 4 叙述，去掉重复的 `nextclaw start`。
- 将 Step 4 改为“默认用户已打开 NextClaw 页面”语义。
- 明确 UI 导航路径为：`设置 -> 提供商 -> 全部提供商 -> MiniMax`（英文镜像同步为 `Settings -> Providers -> All Providers -> MiniMax`）。

变更文件：
- `apps/docs/zh/guide/tutorials/provider-options.md`
- `apps/docs/en/guide/tutorials/provider-options.md`

## 测试/验证/验收方式

- 文档双语镜像校验：`pnpm docs:i18n:check`
- 文档构建验证：`pnpm --filter @nextclaw/docs build`
- 验收点：
  - Step 4 不再要求重复启动服务；
  - Step 4 导航路径与当前 UI 信息架构一致。

## 发布/部署方式

- docs-only 变更，合并后执行：`pnpm deploy:docs`
- 不涉及后端、数据库、migration 与服务部署。

## 用户/产品视角的验收步骤

1. 打开“安装后第一步：选择模型接入方式”页面。
2. 在 API Key（MiniMax 示例）路径查看 Step 4。
3. 确认文档假设用户已在 NextClaw 页面中。
4. 按 `设置 -> 提供商 -> 全部提供商 -> MiniMax` 完成定位。
