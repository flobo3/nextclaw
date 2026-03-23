# v0.14.128 Desktop Release X64 Asset Naming And Promotion

## 迭代完成说明（改了什么）
- 修正 desktop release 工作流中的 macOS Intel 资产命名：
  - 新增 macOS 产物规范化步骤，将未显式带架构后缀的 Intel 产物重命名为 `-x64.dmg` 与 `-x64-mac.zip`。
  - 移除 x64 冒烟阶段“找不到 `-x64` 就回退匹配非 `-arm64` 文件”的隐式兜底，改为要求显式命名，避免用户和流程继续猜测架构。
- 更新桌面端文档口径：
  - `apps/desktop/README.md` 明确列出 macOS `arm64` 与 `x64` 两套发布产物命名。
  - `docs/internal/desktop-install-unsigned.md` 补充 Intel macOS 安装包名称。
- 在线修正 GitHub Release：
  - 将 `v0.13.24-desktop.5` 的 macOS Intel 资产在线改名为显式 `-x64` 后缀。
  - 将该 release 从 `pre-release / preview` 提升为正式发布，并更新双语 release notes。
  - 正式发布地址：[NextClaw Desktop 0.0.60](https://github.com/Peiiii/nextclaw/releases/tag/v0.13.24-desktop.5)

## 测试/验证/验收方式
- 本地配置验证：
  - `ruby -e 'require "yaml"; YAML.load_file(".github/workflows/desktop-release.yml"); puts "yaml-ok"'`
  - 结果：通过，`desktop-release.yml` YAML 结构可正常解析。
- 本地命名逻辑验证：
  - 在临时目录构造 `NextClaw Desktop-0.0.60.dmg`、`NextClaw Desktop-0.0.60-mac.zip` 及对应 `.blockmap`，执行与 workflow 一致的重命名逻辑。
  - 结果：成功得到 `NextClaw Desktop-0.0.60-x64.dmg`、`NextClaw Desktop-0.0.60-x64-mac.zip` 及对应 `.blockmap`。
- 线上 release 验证：
  - GitHub API 校验 `v0.13.24-desktop.5`：
    - `prerelease=false`
    - release 名称为 `NextClaw Desktop 0.0.60`
    - 资产列表包含：
      - `NextClaw.Desktop-0.0.60-arm64.dmg`
      - `NextClaw.Desktop-0.0.60-x64.dmg`
      - `NextClaw.Desktop-0.0.60-arm64-mac.zip`
      - `NextClaw.Desktop-0.0.60-x64-mac.zip`
  - GitHub API `releases/latest` 校验结果：
    - 最新正式发布已指向 `v0.13.24-desktop.5`
- `build/lint/tsc` 判定：
  - 不适用。本次未修改桌面应用源码或类型定义，改动集中在 GitHub release workflow、文档与线上 release 元信息；因此采用 YAML 解析、命名逻辑模拟和 GitHub API 结果校验作为最小充分验证。

## 发布/部署方式
- 仓库侧：
  - 合并当前仓库改动后，后续执行 `.github/workflows/desktop-release.yml` 时会自动生成显式 `x64` 命名的 macOS Intel 资产。
- GitHub Release 侧：
  - 通过 GitHub API 直接修改现有 release `v0.13.24-desktop.5`：
    - 将 x64 `dmg` / `mac.zip` 及对应 `.blockmap` 在线重命名为显式 `-x64`。
    - 更新 release 标题、双语正文、`prerelease` 状态。
- 本次不涉及应用部署、数据库 migration 或 npm 包发布。

## 用户/产品视角的验收步骤
1. 打开 [NextClaw Desktop 0.0.60 release 页面](https://github.com/Peiiii/nextclaw/releases/tag/v0.13.24-desktop.5)。
2. 确认 macOS 下载区存在两套清晰区分的安装包：
   - Apple Silicon：`...-arm64.dmg`
   - Intel：`...-x64.dmg`
3. 确认 macOS 对应 `zip` 资产也分别带 `arm64` 与 `x64` 后缀，不再出现“无后缀的 Intel 包”。
4. 确认页面不再显示 `Pre-release` 标记，且 release 标题为 `NextClaw Desktop 0.0.60`。
5. 在官网下载或 release 页面引导用户时，可以直接按架构说明选择包，不再需要解释“无后缀那个其实是 Intel/x64”。
