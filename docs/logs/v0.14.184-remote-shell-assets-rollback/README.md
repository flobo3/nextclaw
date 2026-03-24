# v0.14.184-remote-shell-assets-rollback

## 迭代完成说明

- 回滚 `v0.14.183` 中“由 gateway worker 统一托管 remote 页面壳与静态资源”的实现。
- 回滚原因不是小风险，而是该实现破坏了 remote 场景最关键的版本隔离前提：浏览器端页面壳被固定为平台统一版本，不再与每台设备自己的 NextClaw 版本自洽，可能直接导致应用不可用。
- 恢复为原先通过 remote relay 代理页面壳与静态资源的行为，先确保可用性与版本一致性正确，再重新设计降本方案。

## 测试/验证/验收方式

- `pnpm -C workers/nextclaw-provider-gateway-api build`
- `pnpm -C workers/nextclaw-provider-gateway-api lint`
- `pnpm -C workers/nextclaw-provider-gateway-api tsc`
- `pnpm -C workers/nextclaw-provider-gateway-api test:quota`
- `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths workers/nextclaw-provider-gateway-api/src/index.ts workers/nextclaw-provider-gateway-api/wrangler.toml workers/nextclaw-provider-gateway-api/README.md docs/logs/v0.14.184-remote-shell-assets-rollback/README.md`

## 发布/部署方式

- 发布 worker：`pnpm -C workers/nextclaw-provider-gateway-api run deploy`
- 本次未触达数据库结构与 D1 migration，`db:migrate:remote` 不适用。
- 发布后应优先验证 remote 会话重新恢复可用，不再托管统一版本的公共 remote shell。

## 用户/产品视角的验收步骤

1. 打开 platform 中某个 remote instance。
2. 确认 remote 页面恢复可用，不再出现因页面壳版本不匹配导致的加载或运行异常。
3. 在不同版本的 NextClaw 设备上分别打开 remote，会话都应回到各自版本自洽的原始行为。
4. 之后再重新评估降本方案时，必须以“不破坏版本隔离”为硬约束。
