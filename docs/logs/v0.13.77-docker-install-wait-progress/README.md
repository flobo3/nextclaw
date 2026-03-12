# v0.13.77-docker-install-wait-progress

## 迭代完成说明（改了什么）
- 优化 Docker 官网一键脚本等待期可观测性：
  - 文件：[apps/landing/public/install-docker.sh](../../../apps/landing/public/install-docker.sh)
  - 新增启动提示：`Bootstrapping runtime inside container (npm install + first start)...`
  - 等待健康检查期间每 10 秒输出一次进度：`Waiting for service readiness... <elapsed>/<timeout>`
- 已将该脚本发布到生产域名 `nextclaw.io`。

## 测试/验证/验收方式
- 语法检查：
  - `bash -n apps/landing/public/install-docker.sh`
- 构建验证：
  - `pnpm -C apps/landing build`
- 线上脚本内容校验：
  - `curl -fsSL https://nextclaw.io/install-docker.sh | rg "Bootstrapping runtime|Waiting for service readiness"`
- 真实 Docker 冒烟：
  - `curl -fsSL https://nextclaw.io/install-docker.sh | NEXTCLAW_DOCKER_CONTAINER_NAME=<name> NEXTCLAW_DOCKER_DATA_DIR=<tmp-dir> NEXTCLAW_DOCKER_UI_PORT=19391 NEXTCLAW_DOCKER_API_PORT=19390 bash`
  - 观察到：
    - 进度提示按 10 秒打印
    - 脚本最终输出 `Health check passed`
    - UI/API 链接可访问

## 发布/部署方式
- 已发布 landing 生产资源：
  - `pnpm --filter @nextclaw/landing build`
  - `pnpm dlx wrangler pages deploy apps/landing/dist --project-name nextclaw-landing`

## 用户/产品视角的验收步骤
1. 执行：`curl -fsSL https://nextclaw.io/install-docker.sh | bash`
2. 若首次安装较慢，终端应持续看到“Bootstrapping...”和“Waiting for service readiness...”进度日志。
3. 出现 `Health check passed` 后，复制终端输出的 `UI` 链接到浏览器可直接访问。
