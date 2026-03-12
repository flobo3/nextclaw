# v0.13.76 Desktop Linux Release Hardening

## 迭代完成说明（改了什么）
- 修复 Linux AppImage 冒烟脚本：
  - 先将 AppImage 路径规范为绝对路径，避免 `cd` 后找不到文件。
  - 优先选择真实可执行文件 `@nextclawdesktop`，避免误用 `AppRun` 导致运行时初始化失败。
- 修复 macOS x64 冒烟路径匹配：
  - 当找不到 `*-x64.dmg` 时，回退匹配非 `-arm64.dmg` 的 `*.dmg`。
- 修复 GitHub Release 资产上传失败：
  - 移除 `publish-release-assets` 中强匹配 `*.AppImage.blockmap`（该文件在当前构建链路下可能不存在），保留 `*.blockmap` 通配。
- 修复 landing 下载页兜底资产与匹配规则：
  - `macX64Dmg` 兜底链接改为 `NextClaw.Desktop-0.0.27.dmg`。
  - `macX64Dmg` 资产匹配规则支持两种命名：`...-x64.dmg` 与 `... .dmg`。
- 更新 GitHub Release `v0.9.21-desktop.10` 正文验证结果（中英双块，英文在前）。

## 测试/验证/验收方式
- CI 验证：
  - `desktop-release` run `23002551660` 全量通过：
    - `desktop-darwin-arm64`: success
    - `desktop-darwin-x64`: success
    - `desktop-win32-x64`: success
    - `desktop-linux-x64`: success
    - `publish-release-assets`: success
- 本地验证：
  - `bash -n apps/desktop/scripts/smoke-linux-appimage.sh`
  - 下载 release 资产后执行：
    - `hdiutil verify NextClaw.Desktop-0.0.27-arm64.dmg`
    - `hdiutil verify NextClaw.Desktop-0.0.27.dmg`
    - `unzip -l NextClaw.Desktop-win32-x64-unpacked.zip | rg "NextClaw Desktop\.exe"`
    - `apps/desktop/scripts/smoke-macos-dmg.sh` 对 arm64/x64 DMG 均通过

## 发布/部署方式
- GitHub Release：
  - 通过 tag `v0.9.21-desktop.10` 触发 `.github/workflows/desktop-release.yml`
  - 完成 assets 上传后，使用 `gh release edit` 更新 release notes。
- Landing 部署：
  - 执行 `pnpm deploy:landing`
  - 本次部署地址：`https://d409e508.nextclaw-landing.pages.dev`

## 用户/产品视角的验收步骤
- 打开 release 页面，确认存在四类安装包：
  - macOS arm64 DMG
  - macOS x64 DMG
  - Windows x64 ZIP
  - Linux x64 AppImage
- macOS 用户按“先点完成 -> 系统设置隐私与安全性 -> 仍要打开”流程可打开。
- Windows 用户解压后可直接看到并启动 `NextClaw Desktop.exe`。
- Linux 用户执行：
  - `chmod +x NextClaw.Desktop-*-linux-x64.AppImage`
  - `./NextClaw.Desktop-*-linux-x64.AppImage`
- 打开官网下载页（`/en/download/`、`/zh/download/`）确认 Linux 下载入口与教程可见。
