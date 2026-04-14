## English Version

Preview beta for investigating the long Windows first-launch delay after desktop install.

Launcher version: `0.0.141`  
Bundle version: `0.17.11`

This preview focuses on the desktop bootstrap path before the first window appears:

- Ship packaged seed metadata with the installer so the launcher can avoid redundant archive reads before deciding whether the packaged seed needs reinstall.
- Add desktop startup timing logs so we can distinguish `bundle bootstrap` time from `runtime startup` time in real Windows field logs.
- Keep the previous packaged-seed recovery and update-signature contract intact.

What to watch on Windows:

- Whether first launch is still extremely slow after install
- Whether CPU / fan spike duration is shorter than the current stable build
- New log lines:
  - `Desktop bundle bootstrap finished in ...ms`
  - `Desktop runtime startup finished in ...ms`

**Full Changelog**: https://github.com/Peiiii/nextclaw/compare/v0.17.11-desktop.1...v0.17.11-desktop-beta.1

## 中文版

这是一个用于排查 Windows 桌面端“安装后首次启动很久”问题的 preview beta。

Launcher 版本：`0.0.141`  
Bundle 版本：`0.17.11`

本次预发布重点观察首次开窗前的桌面 bootstrap 链路：

- 安装包现在会直接携带 packaged seed metadata，启动器在判断 packaged seed 是否需要重铺时，不再先重复整包读 zip。
- 新增桌面启动分段耗时日志，方便在真实 Windows 现场区分 `bundle bootstrap` 和 `runtime startup` 分别耗时多少。
- 继续保留此前已修好的 packaged seed 自愈与更新验签合同。

Windows 上建议重点观察：

- 安装后首次启动是否仍然非常慢
- CPU / 风扇拉高的持续时间是否比当前 stable 更短
- 新增日志：
  - `Desktop bundle bootstrap finished in ...ms`
  - `Desktop runtime startup finished in ...ms`

**完整变更**: https://github.com/Peiiii/nextclaw/compare/v0.17.11-desktop.1...v0.17.11-desktop-beta.1
