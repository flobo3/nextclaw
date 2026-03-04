# 2026-03-04 v0.0.1-desktop-windows-auto-smoke

## 迭代完成说明（改了什么）

- 为桌面端新增 Windows 无人工自动冒烟脚本：`apps/desktop/scripts/smoke-windows-installer.ps1`。
- 将该冒烟接入 `desktop-release` 工作流（Windows 构建后自动执行）。
- 验收标准收敛为两条：
  - 桌面端能够启动（进程不提前退出）
  - API 健康检查可调用成功（`/api/health` 返回 `ok=true` 且 `status=ok`）
- 增加失败时日志上传，便于定位用户端“打开报错”问题。

## 测试 / 验证 / 验收方式

- 本地静态检查：
  - 查看 `desktop-release` workflow 新增步骤是否位于 Windows build 后、上传前。
  - 查看 `smoke-windows-installer.ps1` 是否包含静默安装、启动、端口轮询、`/api/health` 断言。
- CI 验证：
  - 触发 `desktop-release` workflow。
  - 观察 `desktop-win32-x64` job：
    - `Build Desktop (Windows)` 通过
    - `Smoke Desktop (Windows)` 通过
    - `Upload desktop artifacts (Windows)` 才执行

## 发布 / 部署方式

- 合并后无需额外手工步骤。
- 每次执行 `desktop-release` 时，Windows 产物会自动经过“启动 + API 健康检查”验证，再上传 release 资产。

## 用户 / 产品视角的验收步骤

1. 在 GitHub Actions 打开 `desktop-release` 最新运行记录。
2. 确认 `desktop-win32-x64` 的 `Smoke Desktop (Windows)` 通过。
3. 下载同一运行生成的 Windows 安装包并安装。
4. 启动桌面端，确认可正常进入并具备可用 API（至少健康检查可通）。
