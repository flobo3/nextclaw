# v0.14.275-marketplace-fetch-retry

## 迭代完成说明

- 在 [`packages/nextclaw/src/cli/skills/marketplace.ts`](packages/nextclaw/src/cli/skills/marketplace.ts) 为 marketplace 相关 `fetch`（skill item、files 清单、blob 下载、admin upsert）增加**可重试**网络包装：对 `ECONNRESET`、`ETIMEDOUT`、`fetch failed` 等瞬时错误做指数退避重试（默认最多 5 次），减少公网 TLS 抖动导致的 `skills install` / `skills publish` 偶发失败。
- 在 [`packages/nextclaw/src/cli/skills/marketplace.install.test.ts`](packages/nextclaw/src/cli/skills/marketplace.install.test.ts) 增加「首次请求 ECONNRESET、第二次成功」的回归用例。

## 测试/验证/验收方式

```bash
cd packages/nextclaw && pnpm exec vitest run src/cli/skills/marketplace.install.test.ts src/cli/skills/marketplace.publish.test.ts
cd packages/nextclaw && pnpm run build
```

- 冒烟（非仓库目录）：

```bash
tmp=$(mktemp -d /tmp/nextclaw-skills.XXXXXX)
node packages/nextclaw/dist/cli/index.js skills install linear-cli --api-base https://marketplace-api.nextclaw.io --workdir "$tmp"
node packages/nextclaw/dist/cli/index.js skills install lark-cli --api-base https://marketplace-api.nextclaw.io --workdir "$tmp"
rm -rf "$tmp"
```

## 发布/部署方式

- 需将 `@nextclaw`/`nextclaw` 按仓库发布流程升级后，用户全局安装的 CLI 才包含重试逻辑；仅改源码不发布时，可使用仓库内 `packages/nextclaw/dist/cli/index.js` 验证。

## 用户/产品视角的验收步骤

1. 使用新版本 CLI 执行 `nextclaw skills install linear-cli`（或 `lark-cli`），在偶发网络抖动下应自动重试而非立刻失败。
2. 全局安装路径：升级已发布的 `nextclaw` npm 包后再试。

## 红区触达与减债记录

- 本次未触达 [`scripts/maintainability-hotspots.mjs`](scripts/maintainability-hotspots.mjs) 所列红区文件：不适用。
