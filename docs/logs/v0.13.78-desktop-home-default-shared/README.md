# v0.13.78 desktop-home-default-shared

## 迭代完成说明（改了什么）

- 在 `apps/desktop/src/main.ts` 移除开发态自动写入隔离 `NEXTCLAW_HOME` 的逻辑。
- 调整后行为：
  - 开发态与生产态在“未显式设置 `NEXTCLAW_HOME`”时，默认共享同一 `~/.nextclaw`。
  - 若需要隔离，仍可手动通过环境变量显式设置不同的 `NEXTCLAW_HOME`。
- 保留已实现的生产态 managed-service 复用逻辑与退出清理逻辑（本次未回退）。

## 测试/验证/验收方式

- 代码质量与构建验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop build`
- 冒烟验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop smoke`
  - 观察点：输出包含 `desktop runtime smoke passed`。
- 关键行为检查：
  - 检查 `apps/desktop/src/main.ts` 中不再存在开发态默认 `process.env.NEXTCLAW_HOME = ...` 赋值逻辑。

## 发布/部署方式

- 本次为 Desktop 运行时策略微调，沿用既有 Desktop 发布流程：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/desktop build`
  - 按需执行 `dist` 产物打包与发布。
- 不涉及数据库/远程 migration。

## 用户/产品视角的验收步骤

1. 不设置 `NEXTCLAW_HOME`，先启动生产态服务并确认可用。
2. 在同机启动开发态 Desktop（`pnpm -C apps/desktop dev`）。
3. 验证两者默认读取同一套 `~/.nextclaw` 配置与状态。
4. 如需并行隔离测试，手动为开发态设置单独 `NEXTCLAW_HOME`，验证可切换到隔离模式。
