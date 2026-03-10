# v0.13.44 desktop smoke runtime fallback hardening

## 迭代完成说明（改了什么）

- 修复桌面冒烟脚本在 CI 环境下的稳定性问题：
  - `apps/desktop/scripts/smoke-macos-dmg.sh`
    - 运行时回退路径新增 `app.asar` 内部 `nextclaw` CLI 检测。
    - 移除固定 `18791` 端口种子，避免误命中非本次进程的本地服务。
  - `apps/desktop/scripts/smoke-windows-desktop.ps1`
    - 新增 runtime fallback（`init` + `serve`）路径，支持通过 `ELECTRON_RUN_AS_NODE` 直接验证打包内 CLI。
    - 新增 app/runtime 日志输出与失败时日志回显，便于定位 CI 启动问题。
    - 移除固定 `18791` 端口种子，避免假阳性。
- 调整 `.github/workflows/desktop-release.yml` 的 Windows 冒烟日志上传路径，补充 `${{ runner.temp }}/nextclaw-desktop-smoke-logs/**`。

## 测试/验证/验收方式

- 本地静态校验：
  - `bash -n apps/desktop/scripts/smoke-macos-dmg.sh`
  - `pwsh -NoProfile -Command \"& { [ScriptBlock]::Create((Get-Content -Raw 'apps/desktop/scripts/smoke-windows-desktop.ps1')) > $null }\"`
- 发布链路验证：
  - 触发 `desktop-release` workflow（`workflow_dispatch` + `release_tag`）。
  - 验收点：
    - macOS 与 Windows 冒烟步骤通过，或至少在失败时产出可下载日志。
    - `publish-release-assets` 正常执行并上传发布资产。

## 发布/部署方式

1. 合并本次脚本与 workflow 调整到 `master`。
2. 使用目标 tag 触发 `desktop-release` workflow。
3. 工作流通过后，更新对应 GitHub Release 为双语正式说明（English Version 在前，中文版在后）。

## 用户/产品视角的验收步骤

1. 打开对应 tag 的 GitHub Release，确认 macOS 与 Windows 资产完整可下载。
2. 下载并启动 macOS DMG 版本，确认应用可启动且本地 API 健康检查可用。
3. 下载并启动 Windows EXE（unpacked）版本，确认应用可启动且本地 API 健康检查可用。
4. 在 Release 页面确认说明为双语双区块格式（`English Version` 在前，`中文版` 在后）。
