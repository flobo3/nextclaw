# v0.13.77 desktop-prod-single-instance-dev-coexist

## 迭代完成说明（改了什么）

- 调整 Desktop runtime 启动策略：
  - 生产态（`app.isPackaged=true`）改为走 `nextclaw start` 管理模式，不再直接 `serve --ui-port` 拉起前台 runtime。
  - 生产态通过读取 `NEXTCLAW_HOME/run/service.json` 获取已运行 service 的 UI 地址并复用，满足“已启动即跳过重复启动”。
- 保留开发态并发调试能力：
  - 开发态（`app.isPackaged=false`）继续使用嵌入式 `serve` 路径。
  - 若未显式设置 `NEXTCLAW_HOME`，开发态自动设置隔离目录（`userData/nextclaw-dev-home`），避免与生产态共享同一服务与配置。
- 修复退出清理闭环：
  - Desktop 在 `before-quit` 阶段增加 runtime 停止流程，避免开发态嵌入 `serve` 子进程残留成为孤儿进程。

## 测试/验证/验收方式

- 代码质量验证（受影响子项目最小充分验证）：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop tsc`
- 冒烟验证（用户可运行行为）：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop smoke`
  - 观察点：输出包含 `desktop runtime smoke passed`。
  - 生产态路径补充冒烟：使用临时 mock CLI（`init/start`）+ `RuntimeServiceProcess(mode=managed-service)` 验证会读取 `service.json.uiUrl` 并返回目标地址，输出 `desktop managed-service smoke passed`。

## 发布/部署方式

- 本次为 Desktop 运行时行为修复，按现有 Desktop 发布流程执行：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop build`
  - 如需产物发布，继续执行既有 `dist`/打包流程。
- 不涉及数据库、后端 migration。

## 用户/产品视角的验收步骤

1. 在生产环境先启动一次常驻服务（`nextclaw start`），确认服务可用。
2. 启动打包版 Desktop，多次打开/关闭后检查系统进程：不应出现多个重复的 `nextclaw ... serve --ui-port` 实例。
3. 在同一机器上再启动开发态 Desktop（`pnpm -C apps/desktop dev`）。
4. 验证开发态与生产态可并存：开发态不应复用/污染生产态 `NEXTCLAW_HOME`，QQ 等通道不会因双实例共享配置导致重复回复。
