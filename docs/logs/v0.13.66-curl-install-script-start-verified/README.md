# v0.13.66-curl-install-script-start-verified

## 迭代完成说明（改了什么）

- 新增官网一键安装脚本：[`apps/landing/public/install.sh`](../../../apps/landing/public/install.sh)
  - 支持 `curl -fsSL https://nextclaw.io/install.sh | bash`
  - 自动补充常见 PATH（Homebrew/NVM 等）
  - 自动检测 Node/npm；缺失时尝试按平台安装
  - 安装 `nextclaw@latest`（支持 `NEXTCLAW_INSTALL_NPM_PREFIX` 自定义前缀）
  - 默认自动执行 `nextclaw start` 并等待健康检查（`/api/health`）
  - 输出 UI/API URL 与停止命令
- 更新官网安装文案与复制命令：
  - [`apps/landing/src/main.ts`](../../../apps/landing/src/main.ts)
  - 首页复制命令改为 `curl -fsSL https://nextclaw.io/install.sh | bash`
  - 终端动效改为安装脚本输出风格
- 更新中英文 README 快速开始命令：
  - [`README.md`](../../../README.md)
  - [`README.zh-CN.md`](../../../README.zh-CN.md)

## 测试/验证/验收方式

- 语法与构建验证：
  - `bash -n apps/landing/public/install.sh`
  - `pnpm -C apps/landing tsc`
  - `pnpm -C apps/landing build`
- 真实一键安装与启动冒烟（已验证两轮）：
  - 本地 HTTP 模拟官网源：`curl -fsSL http://127.0.0.1:<port>/install.sh | bash`
  - 真实官网 URL：`curl -fsSL https://nextclaw.io/install.sh | bash`
  - 实际执行时注入隔离变量：`NEXTCLAW_INSTALL_NPM_PREFIX=/tmp/...`、`NEXTCLAW_HOME=/tmp/...`、`NEXTCLAW_INSTALL_UI_PORT=19091`
  - 观察点：
    - 脚本完成 npm 安装并输出 `nextclaw version: 0.9.22`
    - `nextclaw start` 成功：`UI: http://127.0.0.1:19091`
    - 脚本内健康检查通过：`Health check passed: http://127.0.0.1:19091/api/health`
    - 手动复验：`curl -fsSL http://127.0.0.1:19091/api/health` 返回 `{"ok":true,...}`
    - 执行 `nextclaw stop` 成功停止服务

## 发布/部署方式

- 本地构建验证通过后，按既有流程发布官网静态资源：
  - `pnpm --filter @nextclaw/landing build`
  - `pnpm deploy:landing`
- 本次已实际执行发布，Wrangler 返回部署地址：
  - `https://438f98b7.nextclaw-landing.pages.dev`
- 发布完成后即可对外使用：
  - `curl -fsSL https://nextclaw.io/install.sh | bash`

## 用户/产品视角的验收步骤

1. 在干净终端执行：`curl -fsSL https://nextclaw.io/install.sh | bash`
2. 终端应看到安装进度、`nextclaw version`、`start` 输出以及健康检查通过提示。
3. 打开输出的 UI URL（默认 `http://127.0.0.1:18791`）进入配置页。
4. 执行 `nextclaw stop`，确认服务可正常停止。
