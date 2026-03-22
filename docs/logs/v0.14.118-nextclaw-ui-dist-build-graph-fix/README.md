# v0.14.118-nextclaw-ui-dist-build-graph-fix

## 迭代完成说明

- 修复 `nextclaw` 打包链路中对 `@nextclaw/ui` 的隐式构建顺序依赖：
  - 在 `packages/nextclaw/package.json` 中为 `nextclaw` 增加显式工作区依赖 `@nextclaw/ui: workspace:*`（devDependency）。
  - 保证 `pnpm -r --filter @nextclaw/desktop... build` 时，`@nextclaw/ui` 会进入递归依赖图，并在 `nextclaw` 执行 `scripts/copy-ui-dist.mjs` 前先完成 `dist` 构建。
- 根因说明：
  - 前一轮 beta `v0.13.24-desktop.2` 虽然已经修复了 NCP 依赖链缺口，但 macOS / Linux fresh runner 仍在 `nextclaw build` 阶段失败。
  - 统一报错为 `UI dist not found at .../packages/nextclaw-ui/dist. Build @nextclaw/ui before packaging nextclaw.`，说明 `nextclaw` 的打包逻辑依赖 `@nextclaw/ui/dist`，但工作区依赖图并未显式声明这层关系。

## 测试/验证/验收方式

- 依赖图验证：
  - `pnpm -r --filter @nextclaw/desktop... list --depth -1`
  - 预期结果：输出中包含 `@nextclaw/ui`
- 构建闭环验证：
  - `pnpm install`
  - `pnpm -r --filter @nextclaw/desktop... build`
  - 预期结果：
    - `packages/nextclaw-ui build` 在 `packages/nextclaw build` 前执行
    - `packages/nextclaw build` 成功输出 `✓ UI dist copied to .../packages/nextclaw/ui-dist`
    - 最终 `apps/desktop build:main` 通过

## 发布/部署方式

- 提交并推送本次 `nextclaw` 构建图修复。
- 基于修复后的远端代码重新创建 desktop beta 预发布并触发 `desktop-release`。
- 待 beta 三平台全部通过后，再创建正式版 desktop release。
- 建议下一轮版号：
  - beta：`v0.13.24-desktop.3`
  - stable：`v0.13.24-desktop.4`

## 用户/产品视角的验收步骤

1. 打开新的 beta Release 页面，确认三平台产物齐全：macOS arm64/x64、Windows x64、Linux x64。
2. 在 macOS 安装 DMG 并打开应用，确认主界面可进入；若为无签名包，按发布说明执行“仍要打开”流程。
3. 在 Windows 解压并运行 `NextClaw Desktop.exe`，确认主界面可交互。
4. 在 Linux 启动 AppImage，确认应用可启动且健康检查通过。
5. beta 全绿后，检查正式版 Release 的版本号、资产列表和下载链接是否与 beta 验收结果一致。
