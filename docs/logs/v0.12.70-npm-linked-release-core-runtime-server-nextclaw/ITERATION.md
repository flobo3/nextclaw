# v0.12.70 npm linked release: core/runtime/server/nextclaw

## 迭代完成说明（改了什么）
- 以联动方式补发了本轮核心包，避免仅发前端导致功能缺失。
- 通过 changeset 联动提升并发布以下包：
  - `@nextclaw/core` `0.7.2 -> 0.7.3`
  - `@nextclaw/runtime` `0.1.1 -> 0.1.2`
  - `@nextclaw/channel-runtime` `0.1.29 -> 0.1.30`
  - `@nextclaw/openclaw-compat` `0.2.0 -> 0.2.1`
  - `@nextclaw/server` `0.6.5 -> 0.6.6`
  - `nextclaw` `0.9.17 -> 0.9.18`
- 本次为 npm 包发布闭环，不涉及数据库 schema 变更。

## 测试/验证/验收方式
- 发布前自动校验（`pnpm release:publish` 内含）：
  - `pnpm build`
  - `pnpm lint`
  - `pnpm tsc`
- 发布结果校验：
  - `npm view @nextclaw/core version`
  - `npm view @nextclaw/runtime version`
  - `npm view @nextclaw/channel-runtime version`
  - `npm view @nextclaw/openclaw-compat version`
  - `npm view @nextclaw/server version`
  - `npm view nextclaw version`
- 冒烟：
  - `NEXTCLAW_HOME=/tmp/... npx -y nextclaw@0.9.18 serve --ui-port 18993`
  - `curl http://127.0.0.1:18993/api/config/meta`

## 发布/部署方式
- 发布流程：
  1. 新建联动 changeset。
  2. 执行 `pnpm release:version`。
  3. 执行 `pnpm release:publish`。
- 本次仅 npm 包发布：
  - 远程 migration：不适用（无后端数据库结构变更）。
  - 线上 API 部署：不适用（未做 worker/service deploy）。

## 用户/产品视角的验收步骤
1. 安装最新版：`npm i -g nextclaw@0.9.18`。
2. 运行 `nextclaw --version`，确认显示 `0.9.18`。
3. 启动后打开 UI，确认功能与本地开发一致。
4. 若此前有后台旧进程，先执行 `nextclaw stop` 再 `nextclaw start`。
5. 若用 npx 验证，建议使用 `nextclaw@0.9.18 serve` 直启并检查 `/api/config/meta`。
