# v0.13.153-marketplace-skeleton-fill-remaining-space

## 迭代完成说明

- 将 marketplace 列表骨架卡片数量从固定少量占位调整为按单页容量铺开，避免加载时仅显示短骨架、下方留下大块空白。
- 补充了对应测试断言，确认 `skills marketplace` 首次加载时会渲染 12 张骨架卡片，以更完整地覆盖列表区可视空间。

## 测试/验证/验收方式

- 通过：`PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui test -- src/components/marketplace/MarketplacePage.test.tsx`
- 通过：`PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui build`
- 通过（含 1 条既有 warning）：`PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui exec eslint src/components/marketplace/MarketplacePage.tsx src/components/marketplace/MarketplacePage.test.tsx`

## 发布/部署方式

- 本次仍为前端 UI 细节修正，沿用既有前端发布流程即可。
- 发布前至少确保 `build` 通过；若走项目命令闭环，可使用 `/release-frontend`。

## 用户/产品视角的验收步骤

1. 打开前端 marketplace 并进入 `Skills` 标签页。
2. 在首次加载或模拟慢网速时观察列表区域。
3. 确认 skeleton 不再只占据顶部几行，而是以更长的骨架列表覆盖主要可视区域。
4. 确认数据返回后，骨架会自然切换为真实技能卡片。
