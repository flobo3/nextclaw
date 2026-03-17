# v0.13.155 desktop-managed-service-contract-hardening

## 迭代完成说明（改了什么）

- 收紧 Desktop 生产态 `managed-service` 的地址契约：
  - `apps/desktop/src/runtime-service.ts` 不再直接消费宽语义 `service.json.uiUrl`。
  - 改为基于 `uiHost/uiPort` 推导 Desktop 自己使用的 UI 地址，并将 `0.0.0.0` / `::` / `localhost` / `::1` 收敛为 `127.0.0.1`。
- 修复 Desktop updater 在无更新元数据场景下影响启动的问题：
  - `apps/desktop/src/updater.ts` 仅在 `resources/app-update.yml` 存在时启用 updater。
  - `checkForUpdates()` 的 Promise 异常改为显式捕获并记录，避免未处理 rejection 影响启动。
- 扩充自动验证：
  - `apps/desktop/scripts/smoke-runtime.mjs` 除原有 `embedded-serve` 冒烟外，新增 `managed-service` 契约校验，验证 `service.json` 中的 `uiHost/uiPort` 会被解析为本地 loopback URL。

## 测试/验证/验收方式

- 本地最小充分验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop smoke`
- 观察点：
  - `smoke` 输出 `desktop runtime smoke passed`
  - `managed-service` 契约验证要求最终地址解析为 `http://127.0.0.1:<port>`
- 发布闭环验证：
  - 推送后使用新的 desktop tag 触发 `.github/workflows/desktop-release.yml`
  - 重点检查 `desktop-win32-x64` 的 `Smoke Desktop (Windows)` 是否恢复通过

## 发布/部署方式

- 本次属于 Desktop 运行时与发布链路修复：
  - 提交代码到 `master`
  - 推送后创建新的 desktop release tag
  - 触发 GitHub Actions `desktop-release.yml`
  - 待四个平台构建与 smoke 通过后，确认 release 资产上传完成
- 不涉及数据库、远程 migration 或服务端部署

## 用户/产品视角的验收步骤

1. 使用打包版 Desktop 启动 NextClaw。
2. 验证 Desktop 能正常打开本地 UI，而不是因为 updater 元数据缺失直接卡死或报错。
3. 在 Windows release smoke 中确认 `NextClaw Desktop.exe` 启动后健康检查可达，不再卡在 `Health API did not become ready`。
4. 重复打开关闭 Desktop，确认生产态仍沿用 `managed-service`，不会额外引入新的运行模式分叉。
