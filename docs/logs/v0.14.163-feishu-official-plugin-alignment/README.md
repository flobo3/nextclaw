# 迭代完成说明

本次迭代把 NextClaw 的飞书能力对齐策略从“继续扩展简化版 channel runtime 实现”切换成“吸收官方飞书插件实现，但不搬运 OpenClaw 宿主系统”。

完成内容：

- 把官方 `@openclaw/feishu@2026.3.13` 插件源码 vendoring 到 `@nextclaw/channel-plugin-feishu`
- 保留官方飞书插件的核心注册能力，使 NextClaw 内置插件可加载以下能力：
  - `feishu_doc`
  - `feishu_app_scopes`
  - `feishu_chat`
  - `feishu_wiki`
  - `feishu_drive`
  - `feishu_bitable_*`
- 调整 `@nextclaw/openclaw-compat` loader：
  - bundled plugin 加载时按插件自身 `rootDir` 建立 alias 上下文
  - 仅当插件本地没有可运行的 `openclaw` 包时，才回退到 compat `openclaw/plugin-sdk` shim
  - jiti 打开 `esmResolve`
  - 对 `@mariozechner/pi-coding-agent` 增加最小 shim，避免插件加载阶段被 `import.meta.resolve` 阻塞
  - 把 bundled plugin 加载 helper 拆出，避免 `loader.ts` 继续膨胀
- 更新飞书上游吸收方案文档：
  - [docs/plans/2026-03-24-feishu-upstream-adoption-plan.md](../../../plans/2026-03-24-feishu-upstream-adoption-plan.md)

# 测试/验证/验收方式

已执行验证：

- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/openclaw-compat build`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/openclaw-compat lint`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/channel-plugin-feishu lint`
- registry 探针验证 `loadPluginRegistry(...)`
  - 结果：`feishu` 插件成功 `loaded`
  - 结果：注册出 `feishu_doc`、`feishu_app_scopes`、`feishu_chat`、`feishu_wiki`、`feishu_drive`、`feishu_bitable_*`
- 隔离目录 CLI 冒烟：
  - `NEXTCLAW_HOME=/tmp/nextclaw-feishu-smoke-YKAzkK PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw dev:build plugins list --json`
  - 结果：CLI `plugins list --json` 中可见 `feishu` bundled plugin，状态为 `loaded`，工具列表完整
- 可维护性守卫：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths ...`
  - 结果：无阻塞项；仅保留 `loader.ts` 既有超预算 warning，且本次已较 `HEAD` 缩短

不适用项：

- 远程 migration：不适用，本次不涉及后端或数据库变更
- 线上 API 冒烟：不适用，本次为 npm 包 / CLI / bundled plugin 发布链路

# 发布/部署方式

本次按仓库标准 npm 发布流程执行：

1. `PATH=/opt/homebrew/bin:$PATH pnpm release:version`
2. 提交版本与代码变更
3. `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:publish`

本次联动发布范围：

- `@nextclaw/channel-plugin-feishu`
- `@nextclaw/openclaw-compat`
- `nextclaw`
- `@nextclaw/mcp`
- `@nextclaw/server`
- `@nextclaw/remote`
- `@nextclaw/ncp-mcp`
- `@nextclaw/desktop`

# 用户/产品视角的验收步骤

1. 安装或升级到本次发布后的 `nextclaw` 版本。
2. 在配置里启用 `channels.feishu`，至少填入：
   - `enabled: true`
   - `appId`
   - `appSecret`
3. 运行 `nextclaw plugins list --json`。
4. 确认输出里存在 `feishu` bundled plugin，且状态为 `loaded`。
5. 确认 `toolNames` 至少包含：
   - `feishu_doc`
   - `feishu_app_scopes`
   - `feishu_chat`
   - `feishu_wiki`
   - `feishu_drive`
   - `feishu_bitable_*`
6. 从产品角度判断，这表示 NextClaw 已不再只是“带一个基础飞书通道”，而是具备了吸收官方飞书工作面能力的内建插件入口。
