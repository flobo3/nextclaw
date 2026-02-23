# v0.6.59-marketplace-worker-readonly

## 迭代完成说明（改了什么）

本次迭代实现了一个可部署的 **Cloudflare Worker 只读 Marketplace API** 子项目，放置于 `workers/marketplace-api`，目标是为前端提供插件/Skill 的分页搜索与推荐能力，同时保证页面侧不暴露任何增删改入口。

主要改动：

1. 新增 Worker 子项目（Hono + TypeScript）并采用分层结构：
- `domain`：模型与仓储接口
- `application`：用例层（列表、详情、推荐）
- `infrastructure`：数据源与仓储实现（当前为 bundled JSON + 内存缓存）
- `presentation`：HTTP 路由、查询参数解析、统一响应

2. 强制只读 API：
- 仅提供 `GET` 接口
- 对 `/api/v1/*` 的非 `GET` 请求统一返回 `405 READ_ONLY_API`

3. 新增仓库内数据清单：
- `workers/marketplace-api/data/catalog.json`
- 当前模式为“数据随 Worker 代码打包发布”，后续可平滑迁移到独立仓库 + KV/R2

4. 新增 CI/CD 工作流：
- `.github/workflows/deploy-marketplace-worker.yml`
- push 到 `master/main` 且命中 Worker 路径后自动执行：build → lint → tsc → deploy

5. 工程接入：
- `pnpm-workspace.yaml`、`package.json` 已将 `workers/*` 纳入 workspace
- 根级 `build/lint/tsc` 已纳入 worker 校验

## 测试 / 验证 / 验收方式

### 工程验证（已执行）

- `pnpm -C workers/marketplace-api build`
- `pnpm -C workers/marketplace-api lint`
- `pnpm -C workers/marketplace-api tsc`
- `pnpm build && pnpm lint && pnpm tsc`

说明：仓库内其它包存在既有 lint warning（非本次引入），不阻断本次交付。

### 冒烟验证（本地隔离环境，已执行）

为遵循“冒烟不写仓库目录”规则，冒烟在 `/tmp` 复制目录下执行。

关键请求与观察点：

- `GET /health` 返回 `ok: true`
- `GET /api/v1/items` 支持分页、搜索、类型过滤
- `GET /api/v1/items/:slug` 返回详情
- `GET /api/v1/recommendations` 返回推荐场景数据
- `POST /api/v1/items` 返回 `405` 且错误码 `READ_ONLY_API`

## 发布 / 部署方式

### 本次已执行部署

- 命令：`pnpm -C workers/marketplace-api run deploy`
- 部署地址：`https://nextclaw-marketplace-api.15353764479037.workers.dev`
- Cloudflare Worker Version ID：`3dcfead2-3e87-4260-971d-10684f377290`

### 线上冒烟（已执行）

- `GET /health`：200
- `GET /api/v1/items?page=1&pageSize=2&q=runtime`：200，返回分页查询结果
- `GET /api/v1/recommendations?scene=default&limit=2`：200，返回推荐结果
- `POST /api/v1/items`：405，验证只读策略生效

### 闭环说明

- 远程 migration：**不适用**（本次无数据库/后端 schema 变更）
- NPM 发布：**不适用**（本次发布对象为 Worker 服务）
- 线上关键 API 冒烟：**已完成**

## 用户/产品视角验收步骤

1. 打开 `https://nextclaw-marketplace-api.15353764479037.workers.dev/health`，确认服务在线。
2. 访问：
- `/api/v1/items?page=1&pageSize=20`
- `/api/v1/items?q=runtime&type=plugin`
- `/api/v1/recommendations?scene=default&limit=5`
确认返回结构可直接用于前端列表、搜索和推荐模块。
3. 使用 `POST /api/v1/items` 做反向验证，确认返回 `405 READ_ONLY_API`。
4. 在前端接入时仅消费上述 `GET` API，不提供任何写操作入口，即可满足当前阶段产品策略。
