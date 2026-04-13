# v0.16.4-desktop-release-smoke-stability

## 迭代完成说明

- 修复 `apps/desktop/scripts/smoke-macos-dmg.sh` 的 macOS DMG 冒烟前置初始化方式，不再依赖打包后 `nextclaw init` 预热配置，而是直接写入最小 `config.json`，避免 `darwin-x64` 产物在 arm64 macOS runner 上卡死在预初始化阶段。
- 为 `.github/workflows/desktop-release.yml` 的 `build-desktop` 矩阵 job 增加 `timeout-minutes: 45`，避免未来类似卡死把整个桌面端预发布链路无限挂住。

## 测试/验证/验收方式

- 已通过：`bash apps/desktop/scripts/smoke-macos-dmg.sh "$(find apps/desktop/release -maxdepth 1 -type f -name '*.dmg' | head -n 1)" 240`
  - 结果：`darwin-x64` 本地复现不再卡死，桌面 app 早退后 `runtime fallback` 成功，健康检查通过 `http://127.0.0.1:55668/api/health`。
- 已通过：`PATH=/opt/homebrew/bin:$PATH pnpm desktop:package:verify`
  - 结果：`darwin-arm64` 本地桌面包验证通过，输出 `macOS package verified: .../apps/desktop/release/NextClaw Desktop-0.0.138-arm64.dmg`。
- 已通过：`bash -n apps/desktop/scripts/smoke-macos-dmg.sh`
- 已通过：`pnpm lint:new-code:governance`
- 已执行：`pnpm lint:maintainability:guard`
  - 结果：当前本地工作区存在未纳入本次提交的既有改动 `apps/desktop/scripts/update/services/build-product-bundle.service.mjs`，其函数预算命中守卫；本次修复涉及的两个文件未命中增量治理规则。

## 发布/部署方式

- 提交本次修复后推送到远程默认分支。
- 创建新的桌面端 preview beta GitHub pre-release tag，触发 `.github/workflows/desktop-release.yml`。
- 等待 `desktop-release` workflow 完成后，确认 GitHub release 已挂载桌面端安装包、bundle、manifest 与更新通道文件。

## 用户/产品视角的验收步骤

- 打开新的桌面端 preview beta GitHub release 页面。
- 确认 release 为 pre-release，且包含 macOS、Windows、Linux 对应安装产物与 bundle/manifest 资产。
- 下载对应平台安装包。
- macOS 上打开 DMG 后完成安装，若桌面 app 首次启动早退，也应能自动切换到 runtime fallback 并返回健康状态。
- 使用桌面端进入配置或聊天主流程，确认本地 UI 可正常打开并访问运行时接口。

## 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。本次优先修正真正导致桌面端 preview beta 卡死的前置初始化路径，没有额外引入新层级或兼容分支。
- 是否优先遵循删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好：是。通过删除对打包后 `nextclaw init` 的依赖，把 smoke 前置准备收敛为直接写最小配置，总代码净减少 3 行。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：是。代码增减报告：新增 11 行，删除 14 行，净增 -3 行。非测试代码增减报告：新增 11 行，删除 14 行，净增 -3 行。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：是。发布 workflow 只增加了统一的 job 超时边界；smoke 脚本删除了一段对打包后 runtime 的额外耦合，职责更清晰。
- 目录结构与文件组织是否满足当前项目治理要求：满足。本次仅修改既有脚本与 workflow，未引入新的目录负担。
- 若本次涉及代码可维护性评估，默认应基于一次独立于实现阶段的 `post-edit-maintainability-review` 填写，而不是只复述守卫结果：已执行独立复核，结论为“通过”。no maintainability findings。
- 长期目标对齐 / 可维护性推进：本次顺着“发布链路更可预测、隐藏卡死点更少、脚本依赖更少”的方向推进了一小步；剩余观察点是桌面端本地工作区里另有未提交的 bundle 相关改动，其维护性债务需要在独立批次继续收口。

