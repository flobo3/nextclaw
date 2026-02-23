# Marketplace API Worker (Read-only)

Cloudflare Worker + Hono 的只读 Marketplace API，用于插件与 Skill 的列表、分页搜索、详情与推荐查询。

## API

- `GET /health`
- `GET /api/v1/items?q=&type=plugin|skill&tag=&sort=relevance|updated|downloads&page=1&pageSize=20`
- `GET /api/v1/items/:slug?type=plugin|skill`
- `GET /api/v1/recommendations?scene=default&limit=10`

> `POST/PUT/PATCH/DELETE` 对 `/api/v1/*` 会返回 `405 READ_ONLY_API`。

## 本地开发

```bash
pnpm -C workers/marketplace-api install
pnpm -C workers/marketplace-api dev
```

## 验证

```bash
pnpm -C workers/marketplace-api build
pnpm -C workers/marketplace-api lint
pnpm -C workers/marketplace-api tsc
```

## 部署

```bash
pnpm -C workers/marketplace-api run deploy
```

需要预先配置：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## 数据源

- 当前数据文件：`workers/marketplace-api/data/catalog.json`
- 当前模式：随 Worker 代码一起发布（GitHub -> Actions -> Cloudflare）
- 后续可替换为独立仓库 + KV/R2，不影响 API 层
