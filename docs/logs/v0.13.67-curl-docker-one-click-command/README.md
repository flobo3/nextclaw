# v0.13.67-curl-docker-one-click-command

## 迭代完成说明（改了什么）

- 新增 Docker 专用官网一键脚本：
  - [`apps/landing/public/install-docker.sh`](../../../apps/landing/public/install-docker.sh)
  - 支持命令：`curl -fsSL https://nextclaw.io/install-docker.sh | bash`
  - 行为：自动拉起 Docker 容器、等待 `/api/health`、输出 UI/API URL 与常用运维命令。
  - 支持参数：`--ui-port`、`--api-port`、`--data-dir`、`--container-name`、`--image`、`--target`、`--health-timeout`、`--dry-run`。
- 更新文档入口为 Docker 线上一键命令优先：
  - [`README.md`](../../../README.md)
  - [`README.zh-CN.md`](../../../README.zh-CN.md)

## 测试/验证/验收方式

- 语法与静态检查：
  - `bash -n apps/landing/public/install-docker.sh`
- 脚本 dry-run（无需本机 Docker）：
  - `curl -fsSL https://nextclaw.io/install-docker.sh | bash -s -- --dry-run`
- 官网发布链路：
  - `pnpm -C apps/landing build`
  - `pnpm deploy:landing`
- 说明：
  - 当前执行环境缺少 `docker` 可执行程序，无法在本地完成真实容器启动冒烟；已完成线上脚本可用性与参数链路验证。真实容器冒烟需在安装了 Docker 的机器执行。

## 发布/部署方式

- 发布 landing 静态资源：
  - `pnpm --filter @nextclaw/landing build`
  - `pnpm deploy:landing`
- 发布后用户可直接执行：
  - `curl -fsSL https://nextclaw.io/install-docker.sh | bash`

## 用户/产品视角的验收步骤

1. 在安装了 Docker 的机器执行：`curl -fsSL https://nextclaw.io/install-docker.sh | bash`
2. 终端应输出：
   - `UI: http://127.0.0.1:<ui-port>`
   - `API: http://127.0.0.1:<ui-port>/api`
3. 浏览器打开 UI URL，进入 NextClaw 页面。
4. 执行终端提示中的 `docker logs -f <container>`、`docker stop <container>` 验证可运维性。
