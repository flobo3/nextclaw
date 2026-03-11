# v0.13.57 desktop release unsigned macos unblock

## 迭代完成说明（改了什么）
- 按当前发布策略（macOS 暂不签名）回退 desktop-release 工作流中的强制签名/公证门禁。
- 移除 `desktop-release.yml` 中 macOS signing secrets 的 fail-fast 校验步骤。
- 移除 `desktop-release.yml` 中仅签名场景可通过的 `codesign/spctl/stapler` 强校验步骤。
- macOS 构建恢复为 `CSC_IDENTITY_AUTO_DISCOVERY=false` 的无签名打包路径，确保 release 闭环可跑通。
- 同步更新 `apps/desktop/README.md`：明确“无签名默认 + 签名可选”两种模式。

## 测试/验证/验收方式
- 触发 `desktop-release` 工作流（tag: `v0.9.21-desktop.5`）验证：
  - macOS job 不再因缺少 signing secrets 失败。
  - Windows job 与 smoke 继续通过。
  - 发布资产上传成功。

## 发布/部署方式
- 提交并推送本次工作流修复到 `master`。
- 使用既有发布 tag 重新触发 `desktop-release`，通过后自动上传到 GitHub Release。

## 用户/产品视角的验收步骤
- 下载最新 Release 的 macOS DMG 与 Windows ZIP。
- Windows 正常安装启动。
- macOS 按当前无签名分发策略执行安装（若出现系统安全提示，按无签名应用流程放行）。
