## English Version

Stable desktop release for the Windows first-launch startup-path fix.

Launcher version: `0.0.141`  
Bundle version: `0.17.11`

This stable release promotes the verified Windows startup investigation fix from preview into the default desktop installer:

- Ship packaged seed metadata with the installer so the launcher can avoid redundant archive reads before deciding whether the packaged seed needs reinstall.
- Add desktop startup timing logs so we can distinguish `bundle bootstrap` time from `runtime startup` time in real Windows field logs.
- Keep the previous packaged-seed recovery and update-signature contract intact.
- Promote the validated `v0.17.11-desktop-beta.1` changes into the next stable desktop release and stable landing fallback.

### Validation Summary

- Passed locally: `pnpm -C apps/desktop lint`
- Passed locally: `pnpm -C apps/desktop tsc`
- Passed locally: `pnpm -C apps/desktop build:main && node --test apps/desktop/dist/src/services/desktop-bundle-bootstrap.service.test.js`
- Passed locally: `PATH=/opt/homebrew/bin:$PATH pnpm desktop:package:verify`
- Preview `v0.17.11-desktop-beta.1` was validated before promotion to this stable release.

### Notes

- This release targets the same `nextclaw 0.17.11` bundle, but upgrades the stable desktop launcher from `0.0.140` to `0.0.141`.
- If GitHub release API lookup fails, the landing-page stable fallback now also points to this release instead of the older `0.0.140` desktop package.

**Full Changelog**: https://github.com/Peiiii/nextclaw/compare/v0.17.11-desktop.1...v0.17.11-desktop.2

## 中文版

这是修复 Windows 桌面端“安装后首次启动很久”链路后的正式稳定版。

Launcher 版本：`0.0.141`  
Bundle 版本：`0.17.11`

这个正式版把已经通过 preview 验证的启动链路优化，提升为默认桌面安装包：

- 安装包现在会直接携带 packaged seed metadata，启动器在判断 packaged seed 是否需要重铺时，不再先重复整包读 zip。
- 新增桌面启动分段耗时日志，方便在真实 Windows 现场区分 `bundle bootstrap` 和 `runtime startup` 分别耗时多少。
- 继续保留此前已修好的 packaged seed 自愈与更新验签合同。
- 将已经验证过的 `v0.17.11-desktop-beta.1` 修复正式提升为新的 stable release，并同步更新 landing 的 stable fallback。

### 验证摘要

- 本地已通过：`pnpm -C apps/desktop lint`
- 本地已通过：`pnpm -C apps/desktop tsc`
- 本地已通过：`pnpm -C apps/desktop build:main && node --test apps/desktop/dist/src/services/desktop-bundle-bootstrap.service.test.js`
- 本地已通过：`PATH=/opt/homebrew/bin:$PATH pnpm desktop:package:verify`
- `v0.17.11-desktop-beta.1` 已在升级为正式版前完成 preview 验证。

### 说明

- 这次正式版保持 `nextclaw 0.17.11` bundle 不变，但把 stable 桌面 launcher 从 `0.0.140` 升级到了 `0.0.141`。
- 如果 GitHub release API 临时不可用，官网 landing 页的 stable fallback 现在也会落到这个正式版，而不是旧的 `0.0.140` 安装包。

**完整变更**: https://github.com/Peiiii/nextclaw/compare/v0.17.11-desktop.1...v0.17.11-desktop.2
