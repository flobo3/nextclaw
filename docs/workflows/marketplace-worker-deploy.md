# Marketplace Worker Deploy Workflow

适用范围：`workers/marketplace-api` 只读 API 服务。

## 目标

- 数据与代码同源（GitHub）
- CI 自动校验（build/lint/tsc）
- 通过 GitHub Actions 自动部署到 Cloudflare Worker

## 本地验证

```bash
pnpm -C workers/marketplace-api build
pnpm -C workers/marketplace-api lint
pnpm -C workers/marketplace-api tsc
```

## 本地手工部署

```bash
pnpm -C workers/marketplace-api run deploy
```

## CI 自动部署

工作流文件：`.github/workflows/deploy-marketplace-worker.yml`

触发条件：

- push 到 `master/main`
- 且变更命中 `workers/marketplace-api/**`

所需 GitHub Secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## 线上验收

部署完成后至少检查：

- `GET /health`
- `GET /api/v1/items?q=runtime&page=1&pageSize=2`
- `GET /api/v1/recommendations?scene=default&limit=2`
- `POST /api/v1/items` 应返回 `405`（验证只读）
