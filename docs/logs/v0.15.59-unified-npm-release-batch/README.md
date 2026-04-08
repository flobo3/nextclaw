# v0.15.59-unified-npm-release-batch

## 迭代完成说明（改了什么）

本次迭代将 2026-04-08 至 2026-04-09 期间已合入但尚未发布到 npm 的公开包统一完成一次批量发布，使用仓库内置 `release:auto:prepare`、`release:version` 与 `release:publish` 闭环执行。

本次实际发布的包版本如下：

- `nextclaw@0.17.3`
- `@nextclaw/core@0.12.2`
- `@nextclaw/server@0.12.2`
- `@nextclaw/ui@0.12.2`
- `@nextclaw/runtime@0.2.34`
- `@nextclaw/remote@0.1.79`
- `@nextclaw/mcp@0.1.67`
- `@nextclaw/openclaw-compat@1.0.2`
- `@nextclaw/agent-chat@0.1.8`
- `@nextclaw/feishu-core@0.2.4`
- `@nextclaw/channel-runtime@0.4.19`
- `@nextclaw/channel-plugin-dingtalk@0.2.33`
- `@nextclaw/channel-plugin-discord@0.2.33`
- `@nextclaw/channel-plugin-email@0.2.33`
- `@nextclaw/channel-plugin-mochat@0.2.33`
- `@nextclaw/channel-plugin-qq@0.2.33`
- `@nextclaw/channel-plugin-slack@0.2.33`
- `@nextclaw/channel-plugin-telegram@0.2.33`
- `@nextclaw/channel-plugin-wecom@0.2.33`
- `@nextclaw/channel-plugin-weixin@0.1.27`
- `@nextclaw/channel-plugin-whatsapp@0.2.33`
- `@nextclaw/ncp-mcp@0.1.69`
- `@nextclaw/ncp-react@0.4.17`
- `@nextclaw/ncp-toolkit@0.5.2`
- `@nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk@0.1.46`
- `@nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk@0.1.46`

同时完成了对应 `CHANGELOG.md`、`package.json`、`packages/nextclaw/ui-dist` 与本地 git tags 的同步。

## 测试 / 验证 / 验收方式

- 发布准备：`PATH=/opt/homebrew/bin:/usr/local/bin:$PATH pnpm release:auto:prepare`
- 版本推进：`PATH=/opt/homebrew/bin:/usr/local/bin:$PATH pnpm release:version`
- 正式发布与注册表校验：`PATH=/opt/homebrew/bin:/usr/local/bin:$PATH pnpm release:publish`
- 线上版本回查：
  - `PATH=/opt/homebrew/bin:/usr/local/bin:$PATH npm view nextclaw version` -> `0.17.3`
  - `PATH=/opt/homebrew/bin:/usr/local/bin:$PATH npm view @nextclaw/core version` -> `0.12.2`
- 非仓库目录 CLI 冒烟：
  - `tmpdir=$(mktemp -d /tmp/nextclaw-release-smoke.XXXXXX) && cd "$tmpdir" && PATH=/opt/homebrew/bin:/usr/local/bin:$PATH pnpm dlx nextclaw@0.17.3 --version`
  - 观察点：输出 `0.17.3`

说明：`release:publish` 已内置执行本批次包的 `build`、`tsc`、`changeset publish`、registry verify 与 `changeset tag`。

## 发布 / 部署方式

- npm 发布：
  1. `PATH=/opt/homebrew/bin:/usr/local/bin:$PATH pnpm release:auto:prepare`
  2. `PATH=/opt/homebrew/bin:/usr/local/bin:$PATH pnpm release:version`
  3. `PATH=/opt/homebrew/bin:/usr/local/bin:$PATH pnpm release:publish`
- 远程 migration：不适用，本次不涉及后端数据库 schema 变更
- 服务部署：不适用，本次仅执行 npm 包发布，不包含 Cloudflare / worker / server 独立部署

## 用户/产品视角的验收步骤

1. 在 npm registry 查看 `nextclaw` 最新版本，确认已显示 `0.17.3`。
2. 在 npm registry 查看 `@nextclaw/core` 最新版本，确认已显示 `0.12.2`。
3. 在任意非仓库临时目录执行 `pnpm dlx nextclaw@0.17.3 --version`。
4. 确认 CLI 能成功安装并输出 `0.17.3`。
5. 若业务侧依赖 `@nextclaw/server`、`@nextclaw/ui`、channel/runtime 相关包，安装对应新版本并确认依赖解析无缺包或版本冲突。

## 可维护性总结汇总

- 长期目标对齐 / 可维护性推进：
  - 本次属于发布批次收口，不是新增源代码功能实现；推进点在于把 2026-04-08 至 2026-04-09 的未发布变更一次性清账，避免包版本、发布状态与仓库状态继续漂移。
- 是否已尽最大努力优化可维护性：
  - 是。优先复用仓库既有 `release:auto:prepare`、`release:version`、`release:publish` 流程完成闭环，没有引入额外脚本或手工发布分叉。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：
  - 是。本次没有新增发布逻辑，只使用现有自动批量发布机制，把多包零散发布收敛为一次统一批次。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：
  - 源代码逻辑层面没有净增长；本次净增主要来自版本号、changelog 与 `ui-dist` 构建产物，属于发布最小必要元信息与产物同步，不代表额外业务复杂度上升。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：
  - 是。本次未改动运行时职责边界，也未新增新的发布抽象；继续沿用既有 release pipeline，避免另起一套临时流程。
- 目录结构与文件组织是否满足当前项目治理要求：
  - 是。本次新增迭代目录遵循 `docs/logs/v<semver>-<slug>/README.md` 规则；其余变更均落在既有包目录、changelog 与构建产物位置。
- 是否基于独立于实现阶段的 `post-edit-maintainability-review` 填写：
  - 不适用。本次没有新增或重构源代码逻辑，主要是自动升版、changelog 更新、构建产物同步与 npm 发布闭环，因此未单独执行源代码可维护性复核 skill。
