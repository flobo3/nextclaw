# v0.14.71-claude-runtime-readiness-hardening

## 迭代完成说明

- 收紧 Claude NCP runtime 的连接策略：
  - 默认 `settingSources` 改为 `["user"]`
  - 默认优先 Claude 自身 settings / auth / gateway
  - 不再默认把 NextClaw provider 的 `apiKey/apiBase` 强行覆盖给 Claude Agent SDK
- 修复 Claude 插件的真实加载回归：
  - `nextclaw-ncp-runtime-plugin-claude-code-sdk` 拆出 `claude-runtime-context.ts` 后，`dist/index.js` 一度引用了不存在的相对模块
  - 现已改为打包单文件产物，插件加载、runtime 注册与 `claude` session type 恢复正常
- 收紧 Claude session type 的 readiness 判定：
  - 不再仅凭 `supportedModels()` 判定 ready
  - 新增真实执行探测
  - 当前本机若返回 `Failed to authenticate. API Error: 403 用户没有有效的claudecode订阅`，则明确展示 `ready=false`
- Claude 运行时错误提取补强：
  - 兼容 `result.is_error === true`
  - Claude 会话真实失败时，前端和 API 都能拿到明确错误文本
- UI 会话类型体验同步补强：
  - `ChatSidebar` 现在会直接展示 runtime 的 `Ready / Setup` 状态与失败原因
  - NCP chat 页会按 runtime 公布的 `supportedModels` 过滤模型列表，并优先回填 `recommendedModel`
  - draft session 若选择了未就绪 runtime，会明确标记 unavailable，而不是静默回退或误导用户直接发送
- 方案文档补充了本机实测边界：
  - [Claude Runtime Model Contract Design](../../plans/2026-03-19-claude-runtime-model-contract-design.md)

## 测试/验证/验收方式

- 类型与构建：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/nextclaw-ncp-runtime-claude-code-sdk tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/nextclaw-ncp-runtime-claude-code-sdk build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw build`
- lint：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/nextclaw-ncp-runtime-claude-code-sdk lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui exec eslint src/components/chat/useChatSessionTypeState.ts src/components/chat/useChatSessionTypeState.test.tsx src/components/chat/ChatSidebar.tsx src/components/chat/ChatSidebar.test.tsx src/components/chat/ncp/ncp-chat-page-data.ts src/components/chat/ncp/ncp-chat-page-data.test.ts src/components/chat/stores/chat-input.store.ts src/api/types.ts`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/openclaw-compat exec eslint src/plugins/types.ts src/plugins/plugin-capability-registration.ts`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server exec eslint src/ui/types.ts`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw exec eslint src/cli/commands/plugins.ts src/cli/commands/ncp/ui-ncp-runtime-registry.ts src/cli/commands/ncp/create-ui-ncp-agent.ts src/cli/commands/ncp/create-ui-ncp-agent.test.ts`
  - 说明：`pnpm --filter @nextclaw/ui lint` 仍会被仓库内既有的两个无关 ESLint error 卡住：
    - `src/components/ui/input.tsx`
    - `src/components/ui/label.tsx`
    - 本轮改动文件的定向 lint 已通过
- 集成测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw exec vitest run src/cli/commands/ncp/create-ui-ncp-agent.test.ts`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui exec vitest run src/components/chat/useChatSessionTypeState.test.tsx src/components/chat/ChatSidebar.test.tsx src/components/chat/ncp/ncp-chat-page-data.test.ts`
- 真实运行态验证：
  - 使用启用了 Claude 插件的隔离 `NEXTCLAW_HOME`
  - 启动：`PATH=/opt/homebrew/bin:$PATH NEXTCLAW_HOME=<tmp-home> pnpm -C packages/nextclaw exec tsx src/cli/index.ts serve --ui-port 19994`
  - `GET /api/ncp/session-types` 真实返回：
    - `claude.ready=false`
    - `claude.reason=authentication_failed`
    - `claude.reasonMessage=Failed to authenticate. API Error: 403 用户没有有效的claudecode订阅`
  - `POST /api/ncp/agent/send` 真实返回：
    - Claude 会话返回 `run.error`
    - 错误文本与 readiness 探测一致
  - 同一实例下 native 正向冒烟通过：
    - `dashscope/qwen3-coder-next`
    - 返回 `NEXTCLAW_NATIVE_STILL_OK`
  - 额外核对：
    - `GET /api/ncp/sessions/claude-real-1` 中 `metadata.session_type=claude`
    - `metadata.claude_session_id` 已落盘
    - 证明真实跑的是 Claude runtime，而不是误回退到 native

## 发布/部署方式

- 本次未执行发布。
- 原因：
  - 已完成代码与真实环境验证
  - 但当前机器上的 Claude 真实推理链路仍返回 `403 用户没有有效的claudecode订阅`
  - 因此本轮目标是把产品状态修正为“诚实可诊断”，而不是对外发布一个仍会误导用户 `ready=true` 的版本

## 用户/产品视角的验收步骤

1. 用启用了 Claude 插件的配置启动 NextClaw。
2. 打开聊天页或请求 `/api/ncp/session-types`。
3. 确认 `Claude` 不再显示为可直接使用，而是展示 setup/错误态。
4. 切到 `Claude` 时，确认模型列表只显示该 runtime 宣布支持的模型，并优先选中推荐模型。
5. 用 Claude 会话发一条最小消息，确认得到明确的 `403 用户没有有效的claudecode订阅` 错误，而不是空白 loading 或假成功。
6. 新建 native 会话并发送一条最小消息，确认 native 回复仍然正常。
