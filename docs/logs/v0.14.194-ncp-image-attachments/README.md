# 迭代完成说明

- 为 NCP 聊天链路补齐图片附件能力，支持在前端输入框里粘贴图片或通过附件按钮选择图片，并把它们作为 NCP `file` part 发送。
- 在 `@nextclaw/ncp-react` 中新增附件读取与请求组装能力，统一限制为 `png/jpeg/webp/gif` 且单图不超过 10 MB，避免前端“看似可发、实际模型不可用”的不确定行为。
- 在 `@nextclaw/ncp-agent-runtime` 中把用户消息里的图片 `file` part 转成 OpenAI 兼容的 `image_url` multimodal content，让运行时真正把图片喂给模型。
- 在 `@nextclaw/agent-chat-ui`、`@nextclaw/ui`、`@nextclaw/ncp-react-ui` 与 `apps/ncp-demo` 中补齐附件状态、输入区 token、消息图片渲染、失败恢复、真实浏览器冒烟与本地 demo 接入。
- 为本次发包生成并发布了联动版本：
  - `@nextclaw/ncp-agent-runtime@0.2.3`
  - `@nextclaw/ncp-react@0.3.4`
  - `@nextclaw/ncp-react-ui@0.2.3`
  - `@nextclaw/agent-chat-ui@0.2.3`
  - `@nextclaw/ui@0.10.1`
  - `@nextclaw/mcp@0.1.43`
  - `@nextclaw/server@0.10.47`
  - `nextclaw@0.15.5`

# 测试/验证/验收方式

- 包级验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/ncp-packages/nextclaw-ncp-agent-runtime lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/ncp-packages/nextclaw-ncp-agent-runtime tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/ncp-packages/nextclaw-ncp-agent-runtime build`
  - `PATH=/opt/homebrew/bin:$PATH packages/nextclaw-ui/node_modules/.bin/vitest run packages/ncp-packages/nextclaw-ncp-agent-runtime/src/context-builder.test.ts`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/ncp-packages/nextclaw-ncp-react lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/ncp-packages/nextclaw-ncp-react tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/ncp-packages/nextclaw-ncp-react build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/ncp-packages/nextclaw-ncp-react-ui lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/ncp-packages/nextclaw-ncp-react-ui tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/ncp-packages/nextclaw-ncp-react-ui build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui test`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui test`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/ncp-demo/frontend lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/ncp-demo/frontend tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/ncp-demo/frontend build`
- 真实冒烟：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/ncp-demo exec node scripts/smoke-ui.mjs`
  - 观察点：页面可上传 `smoke.png`、消息区出现图片、session seed 中存在 user message 的 `file` part、刷新后长任务 stop 状态可恢复。
- 可维护性守卫：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs`
  - 结果：`Errors: 0`，仅保留 `i18n.ts` 历史超预算和 `remote.transport.ts` 接近预算的 warning。
- 发布后注册表核验：
  - `PATH=/opt/homebrew/bin:$PATH npm view nextclaw version`
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/mcp version`
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/server version`
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/ui version`
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/ncp-react version`
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/ncp-react-ui version`
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/ncp-agent-runtime version`
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/agent-chat-ui version`

# 发布/部署方式

- 按项目 NPM 流程执行两轮发布闭环：
  1. 新建 changeset，覆盖 `@nextclaw/agent-chat-ui`、`@nextclaw/ncp-agent-runtime`、`@nextclaw/ncp-react`、`@nextclaw/ncp-react-ui`、`@nextclaw/ui`、`@nextclaw/mcp`、`@nextclaw/server`、`nextclaw`
  2. `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:version`
  3. `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:publish`
- 第一轮发布时发现 `nextclaw@0.15.4` 已在 npm 存在，CLI 包被跳过；因此追加第二个 changeset，仅对 `@nextclaw/mcp`、`@nextclaw/server`、`nextclaw` 再做一次 patch，最终将 CLI 正式发布为 `nextclaw@0.15.5`。
- 发布结果：
  - 第一轮成功发布：`@nextclaw/ncp-agent-runtime@0.2.3`、`@nextclaw/ncp-react@0.3.4`、`@nextclaw/ncp-react-ui@0.2.3`、`@nextclaw/agent-chat-ui@0.2.3`、`@nextclaw/ui@0.10.1`
  - 第二轮成功补发：`@nextclaw/mcp@0.1.43`、`@nextclaw/server@0.10.47`、`nextclaw@0.15.5`
- Git tag 已落地：
  - `@nextclaw/ncp-agent-runtime@0.2.3`
  - `@nextclaw/ncp-react@0.3.4`
  - `@nextclaw/ncp-react-ui@0.2.3`
  - `@nextclaw/agent-chat-ui@0.2.3`
  - `@nextclaw/ui@0.10.1`
  - `@nextclaw/mcp@0.1.43`
  - `@nextclaw/server@0.10.47`
  - `nextclaw@0.15.5`

# 用户/产品视角的验收步骤

1. 打开 NCP 聊天页面或 `apps/ncp-demo`，在输入框里直接粘贴一张 PNG/JPEG/WEBP/GIF 图片，确认输入区出现附件 token。
2. 不输入文字也可以发送附件；发送后确认消息列表内直接显示图片，而不是只显示文件名。
3. 同时发送“图片 + 文本”，确认模型能基于图片返回结果，而不是忽略图片。
4. 故意上传超 10 MB 或非图片文件，确认前端立即提示错误，不会进入“假发送成功”的状态。
5. 刷新页面或切换会话后重新打开该会话，确认历史消息中的图片仍可见。
6. 安装或升级到 `nextclaw@0.15.5` 后打开内置 UI，重复以上步骤，确认 CLI 打包的 `ui-dist` 也具备同样能力。
