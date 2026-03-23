# v0.14.154-no-incident-specific-runtime-band-aids

## 迭代完成说明

- 删除了 `nextclaw update` 中针对本次 npm 坏包事故的运行时特判，避免把 `stderr.includes("workspace:")` 这类一次性事故知识硬编码进 shipped runtime。
- 保留并强化真正的根因修复：新增 [`scripts/ensure-pnpm-publish.mjs`](../../../../scripts/ensure-pnpm-publish.mjs)，要求本仓库所有可发布 workspace 包在 `prepublishOnly` 阶段拒绝 `npm publish`，避免再次把 `workspace:*` 直接发到 npm registry。
- 扩展 [`scripts/check-release-groups.mjs`](../../../../scripts/check-release-groups.mjs)，把“所有 public workspace 包必须挂载 publish guard”纳入仓库级发布校验。
- 更新 [`docs/workflows/npm-release-process.md`](../../../../docs/workflows/npm-release-process.md)，明确禁止在包目录直接执行 `npm publish`。
- 强化 [`AGENTS.md`](../../../../AGENTS.md) 与 [`predictable-behavior-first` skill](../../../../.codex/skills/predictable-behavior-first/SKILL.md)，明确禁止“把当前事故签名、坏版本特征、stderr 文案匹配等一次性知识硬编码进运行时代码”。

## 测试/验证/验收方式

- 发布守卫仓库校验：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH node scripts/check-release-groups.mjs`
  - 结果：通过，确认 release group 与 publish guard 检查都正常。
- 发布守卫负向冒烟：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH npm_config_user_agent='npm/10.9.2 node/v22.16.0 darwin arm64 workspaces/false' npm_package_name='nextclaw' node scripts/ensure-pnpm-publish.mjs`
  - 结果：按预期失败，并提示必须使用 `pnpm publish` 或仓库根 `pnpm release:publish`。
- 发布守卫正向冒烟：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH npm_config_user_agent='pnpm/9.15.1 npm/? node/v22.16.0 darwin arm64' npm_package_name='nextclaw' node scripts/ensure-pnpm-publish.mjs`
  - 结果：通过，无输出。
- 可维护性闸门：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths scripts/ensure-pnpm-publish.mjs scripts/check-release-groups.mjs packages/nextclaw/src/cli/update/runner.ts`

## 发布/部署方式

- 本次尚未执行正式 npm 发布或部署。
- 后续若要修复线上坏包，必须按仓库标准流程发布，不得在包目录直接执行 `npm publish`：
  - `pnpm changeset`
  - `pnpm release:version`
  - `pnpm release:publish`
- 若仅需单包人工发布，也必须在对应包目录执行 `pnpm publish`，并保持 `prepublishOnly` 守卫生效。

## 用户/产品视角的验收步骤

1. 在仓库任一 public workspace 包目录尝试使用 `npm publish`，确认命令被阻止，并看到明确提示说明为何不能用 `npm publish`。
2. 按标准流程执行一次仓库级发布检查，确认不会再出现“某个 public 包漏挂 publish guard”的情况。
3. 查看 `nextclaw update` 失败输出，确认 CLI 只如实展示安装步骤与原始 npm stderr，不再夹带当前事故专属的临时解释逻辑。
4. 查看 `AGENTS.md` 与 `predictable-behavior-first` skill，确认后续 AI 被明确要求优先修复发布/构建/部署根因，而不是把事故特征写入运行时代码。
