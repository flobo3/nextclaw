# v0.12.53-docs-provider-options-quickstart-structure

## 迭代完成说明（改了什么）

- 重写“安装后第一步：先选接入方式”文档结构，采用 quickstart 风格：
  - 目标
  - 前置条件
  - 30 秒决策
  - 路径 A（Qwen Portal）
  - 路径 B（API Key，MiniMax 示例）
  - 验证通过标准
  - 常见错误对照
  - 下一步
- 强化 MiniMax 的 step-by-step（无截图也可执行）：
  - 明确控制台入口地址（全球/中国区）
  - 明确 API Key 页面直达地址（全球/中国区）
  - 明确 NextClaw 内各字段填写、测试连接、保存、模型选择与验证消息
- 保持产品定位：MiniMax 仅示例，不是唯一选项。
- 中英文镜像同步更新：
  - `apps/docs/zh/guide/tutorials/provider-options.md`
  - `apps/docs/en/guide/tutorials/provider-options.md`

## 测试/验证/验收方式

- 文档双语镜像校验：`pnpm docs:i18n:check`
- 文档构建：`pnpm --filter @nextclaw/docs build`
- 验收点：
  - 读者可在无截图情况下按步骤完成配置；
  - Qwen Portal 与 API Key 两条路径边界清晰；
  - MiniMax 地址、字段、验证动作完整可执行。

## 发布/部署方式

- docs-only 变更，合并后执行：`pnpm deploy:docs`
- 不涉及后端、数据库、migration、线上服务部署。

## 用户/产品视角的验收步骤

1. 新用户进入“安装后第一步”页面。
2. 通过“30 秒决策”选择 Qwen Portal 或 API Key 路径。
3. 若走 API Key 路径，按 MiniMax step-by-step 完成 key 创建与回填。
4. 在 NextClaw 中通过连接测试并发送验证消息。
5. 得到预期回复后继续下一步（after-setup / channels）。
