# v0.16.11 Unified Restart Control

## 迭代完成说明（改了什么）

- 将“用户主动重启”收敛为单期可交付方案，并更新设计文档：
  - [Unified Restart Product Experience Implementation Plan](../../plans/2026-04-13-unified-restart-product-experience-plan.md)
- 新增统一 runtime control 服务端契约：
  - `GET /api/runtime/control`
  - `POST /api/runtime/control/restart-service`
- Web 端通过 runtime control host 调用现有 restart coordinator，返回明确的 `Restart Service` 能力与接受结果。
- Desktop 端新增 runtime control IPC：
  - `restartService`
  - `restartApp`
- Electron 主进程作为 Desktop 内嵌运行时的重启 owner，执行 `RuntimeServiceProcess.restart()` 或 `app.relaunch()`。
- 前端 Runtime 页面新增 `Runtime Control` 卡片：
  - Web 支持 `Restart Service`
  - Desktop 支持 `Restart Service` 与 `Restart App`
  - 用户主动重启后进入明确的重启中 / 恢复中 / 失败反馈，而不是只看到普通 network error。
- 将新增运行时控制类型、文案、UI 行为分别拆到独立文件，避免继续撑大热点文件。

## 测试/验证/验收方式

- `pnpm -C packages/nextclaw-server build`
  - 结果：通过，重新构建服务端 runtime control 产物。
- `pnpm -C packages/nextclaw-ui build`
  - 结果：通过，重新构建前端 Runtime 页面与 runtime control 卡片。
- `pnpm -C packages/nextclaw build`
  - 结果：通过，重新构建 CLI/runtime 并将最新 UI bundle 同步到 `packages/nextclaw/ui-dist`。
- `pnpm -C apps/desktop build:main`
  - 结果：通过，重新构建 Electron main/preload 产物。
- `pnpm -C packages/nextclaw-server exec vitest run src/ui/router.runtime-control.test.ts`
  - 结果：通过，2 个测试通过。
- `pnpm -C packages/nextclaw-ui exec vitest run src/components/config/runtime-control-card.test.tsx`
  - 结果：通过，3 个测试通过。
- `pnpm -C packages/nextclaw-server exec tsc -p tsconfig.json --noEmit`
  - 结果：通过。
- `pnpm -C packages/nextclaw-ui exec tsc -p tsconfig.json --noEmit`
  - 结果：通过。
- `pnpm -C apps/desktop exec tsc -p tsconfig.json --noEmit`
  - 结果：通过。
- `pnpm lint:maintainability:guard`
  - 结果：未完全通过。
  - 本次相关的新增热点增长已收敛为 warning 或无增长。
  - 剩余唯一 error 为已有未跟踪文件 `apps/desktop/scripts/smoke-product-update.mjs` 超过新文件 500 行预算；该文件不属于本次重启控制实现。
- Web 端真实功能验证：
  - 启动方式：`NEXTCLAW_HOME=/tmp/nextclaw-restart-smoke-20260413-224610 node packages/nextclaw/dist/cli/index.js start --ui-port 19667 --start-timeout 60000`
  - 验证方式：使用 Playwright 打开真实 `http://127.0.0.1:19667/runtime` 页面，点击前端 `Restart Service` 按钮，而不是直接调用单元测试或裸接口。
  - 观察结果：后台服务 PID 连续三轮从 `36808 -> 44782 -> 52444 -> 81349` 切换，`/api/runtime/control` 在每轮恢复后返回 `lifecycle: "healthy"`，页面最终恢复到健康状态且 `Restart Service` 按钮重新可用。
  - 额外观察：第三轮即时采样捕获到点击后按钮进入 disabled 状态；恢复完成后按钮再次可用。
- Desktop 端真实功能验证：
  - 启动方式：`env -u ELECTRON_RUN_AS_NODE NEXTCLAW_HOME=/tmp/nextclaw-desktop-restart-home-20260413-225219 NEXTCLAW_DESKTOP_DATA_DIR=/tmp/nextclaw-desktop-restart-data-20260413-225219 NEXTCLAW_DESKTOP_RUNTIME_SCRIPT=../../packages/nextclaw/dist/cli/index.js pnpm exec electron . --remote-debugging-port=9333`
  - 验证方式：通过 Playwright CDP 连接真实 Electron 窗口，打开桌面端真实 Runtime 页面，点击前端 `Restart Service` 与 `Restart App` 按钮。
  - `Restart Service` 结果：按钮可用；点击后 Electron 主进程日志出现 `Desktop runtime service restart requested from renderer.`，旧 embedded runtime 以 `SIGTERM` 退出，随后同端口 `61196` 重新启动；页面回到 `Runtime healthy`，环境显示 `Desktop embedded runtime`，`Restart Service` 与 `Restart App` 均重新可用。
  - `Restart App` 结果：按钮可用；接受确认框后 Electron 主进程日志出现 `Desktop app restart requested from renderer.` 与 `before-quit`；旧 runtime 以 `SIGTERM` 退出；随后通过同一 CDP 端口重新连上新桌面进程，页面恢复为 `http://127.0.0.1:61416/chat`，`window.nextclawDesktop.restartApp` 仍可用。
  - 清理结果：测试完成后已停止 Web 后台服务、关闭桌面测试窗口，并确认 `19667` 与 `9333` 没有残留监听。

## 发布/部署方式

- 本次未执行发布。
- 本次已在本地完成 Desktop 与 Web 两种入口的真实功能冒烟。
- 后续发布前仍建议在打包产物上重复 Desktop 冒烟，尤其确认 packaged app 下 `Restart App` relaunch 参数与开发态一致。

## 用户/产品视角的验收步骤

1. 打开 NextClaw 前端的 `Runtime` 页面。
2. 确认页面顶部出现 `Runtime Control` 卡片。
3. 在 Web 环境中确认主动作是 `Restart Service`，`Restart App` 不可用并说明原因。
4. 在 Desktop 环境中确认 `Restart Service` 和 `Restart App` 都可用。
5. 点击 `Restart Service` 后，确认 UI 显示正在重启 / 等待恢复，而不是普通请求失败。
6. 在 Desktop 中点击 `Restart App`，确认先出现确认提示，然后由桌面壳触发应用重启。

## 可维护性总结汇总

- 本次是否已尽最大努力优化可维护性：是。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”：是。实现过程中将 runtime control 类型、i18n 文案、前端 manager、server controller、CLI host、Desktop IPC service 拆成明确 owner，避免继续堆进已有热点大文件。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：代码量净增长，因为这是新的用户可见能力。已将 `packages/nextclaw-server/src/ui/types.ts` 控制回本次前的 899 行，将 `packages/nextclaw/src/cli/commands/service.ts` 控制回本次前的 855 行，并把 `packages/nextclaw-ui/src/lib/i18n.ts` 从本次前 542 行降到 540 行。剩余增长主要来自必要的新能力边界和 UI。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰：是。`RuntimeControlHost` 承担 server runtime control owner，`RuntimeControlManager` 承担前端跨环境动作 owner，`DesktopRuntimeControlService` 承担 Electron IPC owner，`RuntimeServiceProcess.restart()` 只提供进程级能力，不承载 UI 决策。
- 目录结构与文件组织是否满足当前项目治理要求：基本满足。本次新增文件遵循 kebab-case 与角色后缀；但 `packages/nextclaw-server/src/ui/ui-routes`、`packages/nextclaw-ui/src/api`、`packages/nextclaw-ui/src/components/config`、`packages/nextclaw-ui/src/hooks` 等目录已有平铺超预算 warning，属于既有结构约束，本次未进一步扩大为 error。
- 本次涉及代码可维护性评估，已基于独立于实现阶段的 `post-edit-maintainability-review` 思路复核。
- 可维护性复核结论：保留债务经说明接受。
- 本次顺手减债：是。将新增文案从 `i18n.ts` 移出，并把 server/runtime 类型从 `ui/types.ts` 移出，避免热点文件继续净膨胀。
- 代码增减报告：新增约 1439 行，删除约 48 行，净增约 +1391 行；其中包含 599 行设计文档与 108 行测试。
- 非测试代码增减报告：新增约 732 行，删除约 48 行，净增约 +684 行；该统计排除测试与设计文档。
- 可维护性总结：本次是新增跨 Desktop/Web 的产品能力，净增长不可避免；已优先把增长放到明确 owner 文件中，并收回热点文件增长。下一步 watchpoint 是不要继续在 `RuntimeConfig.tsx`、`ui/types.ts`、`service.ts` 中追加逻辑，后续扩展应继续落到 runtime-control 专属边界。
