# v0.16.2-unified-npm-release-batch

## 迭代完成说明（改了什么）

本次迭代把 2026-04-10 到 2026-04-13 期间已经合入、但尚未完成 npm 闭环的一批公开包统一发布到 npm registry，避免仓库当前状态和用户实际可安装版本继续漂移。

发布前先通过 `pnpm release:report:health` 和 `pnpm release:auto:changeset --check` 确认有一批 public packages 存在 unpublished drift；随后执行：

1. `pnpm release:auto:prepare`
2. `pnpm release:version`
3. `pnpm release:publish`

本次实际完成发布的公开包共 28 个：

- `nextclaw@0.17.8`
- `@nextclaw/ui@0.12.6`
- `@nextclaw/server@0.12.4`
- `@nextclaw/core@0.12.4`
- `@nextclaw/runtime@0.2.36`
- `@nextclaw/remote@0.1.81`
- `@nextclaw/mcp@0.1.69`
- `@nextclaw/openclaw-compat@1.0.4`
- `@nextclaw/agent-chat-ui@0.3.3`
- `@nextclaw/channel-runtime@0.4.21`
- `@nextclaw/channel-plugin-dingtalk@0.2.35`
- `@nextclaw/channel-plugin-discord@0.2.35`
- `@nextclaw/channel-plugin-email@0.2.35`
- `@nextclaw/channel-plugin-mochat@0.2.35`
- `@nextclaw/channel-plugin-qq@0.2.35`
- `@nextclaw/channel-plugin-slack@0.2.35`
- `@nextclaw/channel-plugin-telegram@0.2.35`
- `@nextclaw/channel-plugin-wecom@0.2.35`
- `@nextclaw/channel-plugin-weixin@0.1.29`
- `@nextclaw/channel-plugin-whatsapp@0.2.35`
- `@nextclaw/ncp-agent-runtime@0.3.9`
- `@nextclaw/ncp-mcp@0.1.71`
- `@nextclaw/ncp-react@0.4.19`
- `@nextclaw/ncp-toolkit@0.5.4`
- `@nextclaw/nextclaw-ncp-runtime-claude-code-sdk@0.1.19`
- `@nextclaw/nextclaw-ncp-runtime-codex-sdk@0.1.16`
- `@nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk@0.1.48`
- `@nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk@0.1.49`

同时完成了对应 `package.json`、`CHANGELOG.md`、发布 checkpoint 与 git tags 的同步。发布后仓库健康检查已经恢复为 clean。

## 测试 / 验证 / 验收方式

- 发布前漂移检查：
  - `pnpm release:report:health`
  - `pnpm release:auto:changeset --check`
  - 结果：识别出 13 个直接存在 publish drift 的包，以及 1 个当前版本尚未上 registry 的 `nextclaw`，随后在 `changeset version` 阶段按工作区依赖关系扩展为 28 个最终发布包。
- npm 身份校验：
  - `npm whoami`
  - 结果：`peiiii`
- 自动生成发布批次：
  - `pnpm release:auto:prepare`
  - 结果：成功生成 `.changeset/auto-release-batch-20260412171647158.md`
- 版本推进：
  - `pnpm release:version`
  - 结果：成功更新目标包版本、内部依赖和 changelog
- 正式发布：
  - `pnpm release:publish`
  - 结果：28 个公共包发布成功，`release:verify:published` 输出 `published 28/28 package versions`
- 发布后仓库健康检查：
  - `pnpm release:report:health`
  - 结果：`Repository release health is clean.`
- 关键线上版本核验：
  - `npm view nextclaw version` -> `0.17.8`
  - `npm view @nextclaw/ui version` -> `0.12.6`
  - `npm view @nextclaw/core version` -> `0.12.4`
  - `npm view @nextclaw/server version` -> `0.12.4`
- tarball 可下载性核验：
  - `curl -I https://registry.npmjs.org/@nextclaw/server/-/server-0.12.4.tgz`
  - `npm pack @nextclaw/server@0.12.4 --silent`
  - 结果：tarball 返回 `HTTP/2 200`，并可成功下载
- CLI 冒烟：
  - `HOME="$(mktemp -d /tmp/nextclaw-release-npx.XXXXXX)/home" npm exec nextclaw@0.17.8 -- --help`
  - `NEXTCLAW_HOME="$(mktemp -d /tmp/nextclaw-release-pnpm.XXXXXX)/home" pnpm --config.store-dir="$(mktemp -d /tmp/nextclaw-pnpm-store.XXXXXX)" dlx nextclaw@0.17.8 --help`
  - 结果：均成功输出 CLI 帮助
- 可维护性守卫：
  - `pnpm lint:maintainability:guard`
  - 结果：通过；guard 判定“本次无新增源码级 changed code-like files”，治理检查全部通过

说明：发布刚完成后第一次直接执行 `pnpm dlx nextclaw@0.17.8 --help` 曾命中一次 `@nextclaw/server@0.12.4` tarball 404，但后续通过 tarball URL 直连、`npm pack`、`npm exec` 和隔离 store 的 `pnpm dlx` 都验证成功，判断为 npm/客户端缓存与传播的短暂不一致，而非包内容损坏。

## 发布 / 部署方式

- 本次属于 npm 生态统一发版，不涉及数据库 migration，也不涉及 Cloudflare worker / Pages / 后端服务的独立部署
- 推荐执行顺序：
  1. `pnpm release:auto:prepare`
  2. `pnpm release:version`
  3. `pnpm release:publish`
  4. `pnpm release:report:health`
  5. 对关键包执行 `npm view <pkg> version`
  6. 在非仓库临时目录执行 `npm exec nextclaw@<version> -- --help` 或隔离 store 的 `pnpm dlx`
- 当前状态：
  - npm 发布：已完成
  - registry 版本核验：已完成
  - git tags：已完成
  - release health：已清洁
  - CLI 安装冒烟：已完成

## 用户/产品视角的验收步骤

1. 执行 `npm view nextclaw version`，确认结果为 `0.17.8`。
2. 执行 `npm view @nextclaw/ui version`、`npm view @nextclaw/server version`、`npm view @nextclaw/core version`，确认分别为 `0.12.6`、`0.12.4`、`0.12.4`。
3. 在任意非仓库临时目录执行 `npm exec nextclaw@0.17.8 -- --help`。
4. 确认 CLI 能正常安装并输出完整帮助与命令列表。
5. 若业务侧依赖 channel/runtime/NCP 相关包，安装本次新版本并确认依赖解析无缺包或版本冲突。

## 可维护性总结汇总

- 长期目标对齐 / 可维护性推进：
  - 本次不是新增单点功能，而是把最近几天已经形成的用户价值统一推到 npm，让 NextClaw 作为统一入口产品的“仓库状态、包版本、用户可安装版本”重新对齐，减少交付层漂移。
  - 顺手推进的一小步是继续复用仓库既有 `release:auto:prepare`、`release:version`、`release:publish` 主链路完成闭环，没有临时造第二套发布流程。
- 本次是否已尽最大努力优化可维护性：
  - 是。本次没有新增发布脚本或兜底旁路，只使用现有自动发布机制完成真实闭环。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：
  - 是。做法是复用既有自动化，而不是手工逐包发布或临时补一层专用脚本。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：
  - 源码逻辑层面没有新增功能代码；本次净增长主要来自版本号、changelog 和发布元数据，这是完成发布闭环的最小必要增长，没有继续扩大运行时代码复杂度。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：
  - 是。本次没有新增 class / helper / service / store，也没有为发布叠加补丁式抽象，职责仍由既有 release 脚本承担。
- 目录结构与文件组织是否满足当前项目治理要求：
  - 是。新增留痕仅落在 `docs/logs/v0.16.2-unified-npm-release-batch`，其它改动均为既有包目录下的版本与 changelog 同步。
- 若本次涉及代码可维护性评估，是否基于独立于实现阶段的 `post-edit-maintainability-review` 填写：
  - 不适用。本次没有新增或修改业务源代码，只有版本、changelog、发布元数据和 docs 留痕；因此未单独执行 `post-edit-maintainability-review`，改以 `pnpm lint:maintainability:guard` 和发布闭环验证作为本次维护性确认依据。
