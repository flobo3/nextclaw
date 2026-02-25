# 2026-02-25 v0.8.20-npm-readme-sync

## 迭代完成说明（改了什么）

- 新增 npm README 源文件：
  - `docs/npm-readmes/nextclaw.md`
  - `docs/npm-readmes/nextclaw-ui.md`
- 新增 README 同步脚本：
  - `scripts/sync-npm-readmes.mjs`
  - 将源文件同步到发布包目录：
    - `packages/nextclaw/README.md`
    - `packages/nextclaw-ui/README.md`
- 发布流程接入 README 自动同步与校验：
  - `package.json` 新增 `release:sync-readmes` / `release:check-readmes`
  - `release:version` 与 `release:publish` 默认执行 README 同步与一致性检查
- 更新发布流程文档：
  - `docs/workflows/npm-release-process.md` 增加 README 同步步骤与自动说明

## 测试 / 验证 / 验收方式

- README 同步校验：
  - `PATH=/opt/homebrew/bin:$PATH node scripts/sync-npm-readmes.mjs`
  - `PATH=/opt/homebrew/bin:$PATH node scripts/sync-npm-readmes.mjs --check`
- 打包冒烟（验证 npm 包内确实包含 README）：
  - `PATH=/opt/homebrew/bin:$PATH npm pack --dry-run --json`（`packages/nextclaw`）
  - `PATH=/opt/homebrew/bin:$PATH npm pack --dry-run --json`（`packages/nextclaw-ui`）
  - 观察点：输出 `files` 中包含 `README.md`
- 全仓验证（按规则执行）：
  - `PATH=/opt/homebrew/bin:$PATH pnpm build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm tsc`

## 发布 / 部署方式

- 标准发布：
  1. `pnpm changeset`
  2. `pnpm release:version`（自动同步/校验 README + version/changelog）
  3. `pnpm release:publish`（自动同步/校验 README + build/lint/tsc + publish/tag）
- 仅前端发布：
  1. `pnpm release:frontend`
  2. 内部仍会走 `release:version` / `release:publish`，因此自动覆盖 README 同步流程

## 用户 / 产品视角的验收步骤

1. 本地运行 `pnpm release:sync-readmes`，确认两个包 README 被生成/更新。
2. 进入 `packages/nextclaw` 与 `packages/nextclaw-ui`，确认 `README.md` 内容存在且可读。
3. 分别执行 `npm pack --dry-run --json`，确认 `README.md` 出现在打包文件清单。
4. 完成一次发布后，在 npm 页面检查包 README 已展示。

