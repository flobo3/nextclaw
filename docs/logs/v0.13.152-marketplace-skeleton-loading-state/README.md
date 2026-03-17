# v0.13.152-marketplace-skeleton-loading-state

## 迭代完成说明

- 为 `skills marketplace` 列表补充了首屏 `skeleton` 加载态，避免首次进入时出现纯空白或仅文字 loading。
- 优化了 marketplace 列表刷新体验：同一类型下切换搜索、排序、分页时，保留上一屏数据并以轻量忙碌态过渡，减少闪烁和列表塌空。
- 新增了 `MarketplacePage` 前端测试，覆盖“首次加载显示 skeleton”和“后台刷新保留已渲染卡片”两类关键场景。

## 测试/验证/验收方式

- 通过：`PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui test -- src/components/marketplace/MarketplacePage.test.tsx`
- 通过：`PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui tsc`
- 通过：`PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui build`
- 通过（含 1 条既有 warning）：`PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui exec eslint src/components/marketplace/MarketplacePage.tsx src/components/marketplace/MarketplacePage.test.tsx src/hooks/useMarketplace.ts`
- 额外记录：`PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui lint` 未全绿，失败原因为仓库内既有的非本次改动错误（`src/components/ui/input.tsx`、`src/components/ui/label.tsx`、`tailwind.config.js`）。

## 发布/部署方式

- 本次为前端 UI 变更，可按既有前端发布流程执行。
- 本地确认通过后，可执行项目约定的前端发布命令或使用 `/release-frontend` 完成发布闭环。
- 若仅做本地预览，可运行 `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui build` 确认产物可正常生成。

## 用户/产品视角的验收步骤

1. 打开前端 marketplace，并进入 `Skills` 标签页。
2. 在网络稍慢或首次加载时，确认列表区域先展示骨架卡片，而不是空白区域。
3. 在技能列表已出现后，切换搜索词、排序或分页。
4. 确认旧列表不会瞬间消失，页面以轻量过渡继续展示内容，待新结果返回后再更新。
5. 确认无结果场景仍正常展示空状态文案，安装/卸载按钮行为不受影响。
