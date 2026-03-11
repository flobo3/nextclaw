# v0.13.63 landing desktop download stable release

## 迭代完成说明（改了什么）
- 在官网 landing 首屏新增“Desktop 下载模块”，支持 macOS/Windows 两平台入口、设备自动识别、高亮推荐下载项。
- 新增稳定版 Desktop 发布元数据解析：页面默认使用稳定版兜底链接，并在浏览器端自动拉取 GitHub 最新稳定 Desktop release（过滤掉 pre-release / draft）并更新按钮。
- 在下载模块内加入小白可执行教程，明确 macOS 流程：先点“完成” -> 系统设置“隐私与安全性”底部“仍要打开” -> 不行再 `xattr -cr`。
- 更新结构化元数据（en/zh）中的 `downloadUrl`，指向正式版 Desktop release。

## 测试/验证/验收方式
- 构建验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/landing build`
- 冒烟验证（用户可见文案与下载映射已入产物）：
  - `rg -n "Download NextClaw Desktop|Open Anyway|下载 NextClaw Desktop|仍要打开|v0.9.21-desktop.8" apps/landing/dist/assets/main-*.js`
- 正式版资产验证：
  - Workflow Run：`22957806374`（macOS / Windows / 发布资产上传均成功）
  - macOS：下载 `v0.9.21-desktop.8` DMG 后执行 `codesign --verify --deep --strict` 通过（`valid on disk`）
  - Windows：下载 `NextClaw.Desktop-win32-x64-unpacked.zip` 后验证包含 `NextClaw Desktop.exe`
- 说明：本次改动仅触达官网前端与发布文案，不触达 desktop 二进制构建逻辑，`desktop:package` 不适用。

## 发布/部署方式
- GitHub 发布：创建 `v0.9.21-desktop.8` 正式版（非 pre-release），通过 `desktop-release` workflow 上传 macOS/Windows 资产。
- 前端发布：执行 `pnpm deploy:landing`，已完成部署（`https://0a943b5c.nextclaw-landing.pages.dev`）。

## 用户/产品视角的验收步骤
1. 打开官网首页，首屏可看到“下载 NextClaw Desktop”区域。
2. 根据当前系统看到对应推荐下载项（macOS 或 Windows）。
3. 点击下载后可拿到对应平台安装包。
4. 按页面教程操作，macOS 用户可完成首次放行并启动；Windows 用户可完成 SmartScreen 放行并启动。
