# v0.14.191 Codex Packaged Full Access Closure

## 迭代完成说明

- 延续 [`v0.14.190`](../v0.14.190-codex-access-mode-full-access-default/README.md) 的产品权限模型设计，正式落地单字段 `accessMode`，默认 `full-access`。
- 发布后发现 `@nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk@0.1.19` 的安装包缺少内部 helper 产物，运行态加载时报 `Cannot find module './codex-access-mode.js'`。
- 将 Codex runtime plugin 的构建产物改为单入口 bundle：
  - `tsup` 仅产出 `dist/index.js` 与 `dist/index.d.ts`
  - 不再依赖手工维护内部 helper 文件的 entry 列表
  - 从源头修复“新增内部模块后 npm 包漏文件”的发布事故
- 重新发布修正版 `@nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk@0.1.20`，并在本机真实运行实例中升级安装、写入 `accessMode: "full-access"`、复验 Codex 会话可写。

## 测试/验证/验收方式

- 设计与实现验证
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw exec vitest run src/cli/commands/codex-runtime-plugin-provider-routing.test.ts`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk build`
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/index.ts packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/src/codex-access-mode.ts packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk/openclaw.plugin.json packages/nextclaw/src/cli/commands/codex-runtime-plugin-provider-routing.test.ts`
- 发布产物验证
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk pack --pack-destination /tmp/nextclaw-codex-pack`
  - 结果：tarball 仅包含 `dist/index.js`、`dist/index.d.ts`、`openclaw.plugin.json`、`package.json`、`README.md`
- 真实安装态与运行态验证
  - `PATH=/opt/homebrew/bin:$PATH node packages/nextclaw/dist/cli/index.js plugins doctor`
  - `PATH=/opt/homebrew/bin:$PATH curl -sS http://127.0.0.1:9808/api/ncp/session-types`
  - `PATH=/opt/homebrew/bin:$PATH pnpm smoke:ncp-chat -- --session-type codex --model openai/gpt-5.4 --port 9808 --prompt 'Reply exactly OK.' --json`
  - `PATH=/opt/homebrew/bin:$PATH pnpm smoke:ncp-chat -- --session-type codex --model openai/gpt-5.4 --port 9808 --timeout-ms 180000 --prompt 'Create the file /Users/peiwang/.nextclaw/workspace/codex-sandbox-smoke.txt with exact content smoke-ok, then reply exactly WROTE.' --json`
  - `PATH=/opt/homebrew/bin:$PATH cat /Users/peiwang/.nextclaw/workspace/codex-sandbox-smoke.txt`

结果：

- `plugins doctor` 返回 `No plugin issues detected.`
- `9808` 运行实例重新出现 `codex` session type。
- 真实 Codex 会话完成文件写入，目标文件内容为 `smoke-ok`。

## 发布/部署方式

- 先发布产品权限模型版本：`@nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk@0.1.19`
- 发现安装包缺文件后，补做打包源头修复并重新发布：`@nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk@0.1.20`
- 本机运行实例通过以下闭环升级到修正版：
  1. `node packages/nextclaw/dist/cli/index.js plugins uninstall nextclaw-ncp-runtime-plugin-codex-sdk`
  2. `node packages/nextclaw/dist/cli/index.js plugins install @nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk@0.1.20`
  3. `node packages/nextclaw/dist/cli/index.js config set plugins.entries.nextclaw-ncp-runtime-plugin-codex-sdk.config.accessMode full-access`
  4. `node packages/nextclaw/dist/cli/index.js restart`
- 本轮直接执行 `changeset publish` 时，还一并发布了当前工作区中已存在未发布版本号的其它包：
  - `@nextclaw/ncp-mcp@0.1.40`
  - `nextclaw@0.15.3`
  - `@nextclaw/mcp@0.1.41`
  - `@nextclaw/remote@0.1.39`
  - `@nextclaw/server@0.10.45`

## 用户/产品视角的验收步骤

1. 安装 `@nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk@0.1.20` 或更高版本。
2. 在插件配置里只使用 `accessMode`，不再配置 `approvalPolicy`；默认可直接使用 `full-access`。
3. 启动 NextClaw，确认会话类型列表里出现 `Codex`。
4. 新建一个 `Codex + openai/gpt-5.4` 会话，让它执行最小写操作，例如创建工作区测试文件。
5. 确认会话能真正写入文件，而不是落回只读沙箱。
