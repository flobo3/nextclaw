# v0.13.78-docker-default-port-update

## 迭代完成说明（改了什么）
- 将 Docker 一键脚本默认端口从 `18791/18790` 调整为 `18891/18890`：
  - [`apps/landing/public/install-docker.sh`](../../../apps/landing/public/install-docker.sh)
- 同步更新中英文文档教程中的默认端口与示例：
  - [`apps/docs/zh/guide/tutorials/docker-one-click.md`](../../../apps/docs/zh/guide/tutorials/docker-one-click.md)
  - [`apps/docs/en/guide/tutorials/docker-one-click.md`](../../../apps/docs/en/guide/tutorials/docker-one-click.md)

## 测试/验证/验收方式
- 语法检查：
  - `bash -n apps/landing/public/install-docker.sh`
- 本地真实 Docker 冒烟（不传端口参数，验证默认值）：
  - `bash apps/landing/public/install-docker.sh --container-name <name> --data-dir <tmp-dir> --health-timeout 240`
  - 验证结果：
    - 输出 `UI: http://127.0.0.1:18891`
    - 输出 `Gateway (direct): http://127.0.0.1:18890`
    - `curl http://127.0.0.1:18891/api/health` 返回 `HTTP 200`
- 官网脚本真实冒烟（`curl -fsSL https://nextclaw.io/install-docker.sh | bash`）：
  - 输出默认端口已为 `18891/18890`
  - `api/health` 与 UI 页面均返回 `HTTP 200`

## 发布/部署方式
- 已发布 landing 生产资源（脚本生效）：
  - `pnpm deploy:landing`
- 已发布 docs 生产资源（教程生效）：
  - `pnpm deploy:docs`

## 用户/产品视角的验收步骤
1. 执行：`curl -fsSL https://nextclaw.io/install-docker.sh | bash`
2. 观察输出默认地址：
   - `UI: http://127.0.0.1:18891`
   - `API: http://127.0.0.1:18891/api`
   - `Gateway (direct): http://127.0.0.1:18890`
3. 打开 UI 地址，确认可访问；访问 `/api/health`，确认返回健康状态。
