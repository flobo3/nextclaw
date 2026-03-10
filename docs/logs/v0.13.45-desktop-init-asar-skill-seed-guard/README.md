# v0.13.45 desktop init asar skill seed guard

## 迭代完成说明（改了什么）

- 修复桌面打包环境下 `nextclaw init` 在初始化工作区时可能崩溃的问题：
  - 文件：`packages/nextclaw/src/cli/workspace.ts`
  - 在 `seedBuiltinSkills` 中为 `cpSync` 增加异常保护。
  - 当从打包路径（如 `app.asar`）复制内置 skills 失败时，改为 warning 并继续初始化，不再中断启动流程。
- 目标：避免 Electron 打包运行时因 `ENOTDIR` 等复制异常导致 desktop 启动失败。

## 测试/验证/验收方式

- 本地验证（macOS）：
  - `PATH=/opt/homebrew/bin:$PATH pnpm desktop:package:verify`
  - 验收点：
    - DMG 构建成功。
    - 冒烟阶段在主流程失败时可进入 runtime fallback。
    - `/api/health` 返回 `ok=true` 且 `status=ok`。
- 关键观察：
  - 之前会在 `nextclaw init` 出现 `ENOTDIR: not a directory, opendir`；修复后不再阻断启动。

## 发布/部署方式

1. 合并本次修复提交到 `master`。
2. 复用目标 tag 触发 `desktop-release` workflow 完成 macOS/Windows 打包与冒烟。
3. workflow 全部通过后更新 GitHub Release 正式双语说明。

## 用户/产品视角的验收步骤

1. 下载并安装对应版本桌面端（macOS/Windows）。
2. 首次启动（空工作区）时不应因初始化失败直接退出。
3. 启动后确认桌面端可用，健康检查可达。
4. 在 Release 页面确认双语说明与双平台资产均完整可用。
