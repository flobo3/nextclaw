# v0.13.87-provider-model-thinking-session-selector

## 迭代完成说明（改了什么）
- 新增 Provider 模型思考能力配置：在 `providers.*` 下引入 `modelThinking` 字段，支持按模型声明 `supported` 思考档位与可选 `default`。
- 打通配置链路：core schema、server UI types/config 持久化、UI API types 全部对齐 `modelThinking`。
- Provider 配置页增强：每个模型 chip 增加思考能力设置弹层，可多选支持档位并设置默认档位。
- 聊天会话增强：当当前模型配置了思考能力时，输入栏显示思考档位下拉；切换模型时自动做合法性回落。
- 发送链路增强：聊天发送 metadata 注入 `thinking`，支持会话级持久化覆盖。
- 后端兜底：thinking resolver 增加模型能力裁剪，若请求档位不受支持则回落到模型默认档位或 `off`。
- 修复回归问题：发送后 thinking 下拉被默认值覆盖的问题，改为仅在会话切换且历史加载完成后 hydrate 一次服务端 thinking。

## 测试/验证/验收方式
- TypeScript 检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
- 核心测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core test -- --run src/agent/thinking.test.ts src/providers/openai_provider.test.ts`
- 前端构建验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`
- 发布前全量校验（`release:publish` 内置）：
  - `PATH=/opt/homebrew/bin:$PATH pnpm release:check`
  - 结果：`build + lint + tsc` 全部通过（lint 仅历史 warning，无 error）。
- 发布后冒烟（非仓库目录）：
  - `TMP_DIR=$(mktemp -d /tmp/nextclaw-release-smoke.XXXXXX) && cd "$TMP_DIR" && npm init -y && npm install nextclaw@0.9.24 && npx --yes nextclaw --version`
  - 结果：`NEXTCLAW_VERSION=0.9.24`

## 发布/部署方式
- 本次已按项目发布流程完成：
  - `PATH=/opt/homebrew/bin:$PATH pnpm release:version`
  - `PATH=/opt/homebrew/bin:$PATH pnpm release:publish`
- 本轮实际发布（npm）：
  - `@nextclaw/core@0.7.7`
  - `@nextclaw/server@0.6.11`
  - `@nextclaw/ui@0.6.13`
  - `@nextclaw/runtime@0.1.6`
  - `@nextclaw/channel-runtime@0.1.35`
  - `@nextclaw/openclaw-compat@0.2.6`
  - `nextclaw@0.9.24`

## 用户/产品视角的验收步骤
1. 进入 Providers 页面，选中任一 provider，在模型 chip 上打开“思考档位能力”设置。
2. 给某个模型选择支持档位（如 `low/medium/high`）并设置默认档位，点击保存。
3. 回到 Chat 页面，选择该模型，确认底部出现思考档位下拉。
4. 将思考档位切换到非默认值后发送消息，确认发送后下拉不回退到默认值。
5. 切换到未配置思考能力的模型，确认思考下拉隐藏。
6. 切回已配置模型，确认思考档位仍可用，且发送链路稳定。
