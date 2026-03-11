# v0.13.65-docker-one-click-deploy

## 迭代完成说明（改了什么）

- 新增 Docker 部署资产：
  - [`docker/Dockerfile`](../../../docker/Dockerfile)：基于仓库源码构建 NextClaw 运行镜像，容器内执行 `nextclaw serve`。
  - [`docker/compose.yml`](../../../docker/compose.yml)：定义一键启动服务（端口映射、数据卷、自动重启）。
  - [`.dockerignore`](../../../.dockerignore)：避免将无关目录与本地依赖打进构建上下文。
- 新增一键脚本 [`scripts/docker-start.sh`](../../../scripts/docker-start.sh)：
  - 支持 `--ui-port`、`--api-port`、`--data-dir`、`--container-name`、`--dry-run`。
  - 默认执行 `docker compose up -d --build`，等待 `/api/health`，并输出 UI/API 访问地址与常用运维命令。
- 新增根脚本命令：`pnpm docker:start`。
- 更新文档：
  - [`README.md`](../../../README.md)、[`README.zh-CN.md`](../../../README.zh-CN.md) 增加 Docker 一键启动说明与示例。

## 测试/验证/验收方式

- 命令参数与静态检查：
  - `bash scripts/docker-start.sh --help`
  - `bash scripts/docker-start.sh --dry-run`
  - `bash scripts/docker-start.sh --ui-port 18891 --api-port 18890 --data-dir /tmp/nextclaw-docker-smoke --dry-run`
  - `pnpm docker:start -- --dry-run`
- 说明：
  - 本次环境未提供 `docker` 可执行程序，无法执行真实容器启动冒烟（`docker compose up` / 健康探测）；已通过 dry-run 验证参数解析、环境注入与命令拼装。

## 发布/部署方式

- 仓库内一键启动（推荐）：
  - `bash scripts/docker-start.sh`
  - 或 `pnpm docker:start`
- 自定义端口/数据目录：
  - `bash scripts/docker-start.sh --ui-port 18891 --api-port 18890 --data-dir ~/.nextclaw-docker`
- 停止服务：
  - `docker compose -f docker/compose.yml down`

## 用户/产品视角的验收步骤

1. 运行 `bash scripts/docker-start.sh`。
2. 终端应输出：
   - `UI: http://127.0.0.1:<ui-port>`
   - `API: http://127.0.0.1:<ui-port>/api`
3. 浏览器打开 UI 链接，进入 NextClaw 配置页面。
4. 在 UI 配置 provider/model 后，可直接开始使用。
