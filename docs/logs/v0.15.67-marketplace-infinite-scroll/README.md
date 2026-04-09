# v0.15.67-marketplace-infinite-scroll

## 迭代完成说明（改了什么）

本次迭代把 skills / plugins / MCP marketplace 的目录浏览体验从“手动点上一页/下一页”收敛为“滚动触底自动续拉下一页”，让市场页更接近持续探索的入口，而不是把用户拦在分页控件上反复切页。

- 为 [MarketplacePage.tsx](/Users/peiwang/Projects/nextbot/packages/nextclaw-ui/src/components/marketplace/MarketplacePage.tsx) 接入已有的按页累加查询能力与触底加载逻辑：
  - 保留后端分页契约不变；
  - 列表区滚动到底部附近时自动拉取下一页；
  - 删除底部显式分页条，改为底部轻量 loading 状态。
- 为 [McpMarketplacePage.tsx](/Users/peiwang/Projects/nextbot/packages/nextclaw-ui/src/components/marketplace/mcp/McpMarketplacePage.tsx) 做同样的无限滚动切换，保持 MCP 市场与技能/插件市场的一致体验。
- 调整 [use-infinite-scroll-loader.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw-ui/src/hooks/use-infinite-scroll-loader.ts)：
  - `onLoadMore` 接口改为接收更宽的异步返回值，兼容 React Query `fetchNextPage()`；
  - 滚动重置时增加 `scrollTo` 存在性判断，避免测试环境或非标准滚动容器报错。

## 测试 / 验证 / 验收方式

- 组件级定向验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui test -- MarketplacePage McpMarketplacePage`
- UI 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui tsc`
- UI 构建验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui build`
- 仓库维护性守卫：
  - `PATH=/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard`
- 结果摘要：
  - 上述命令均已通过。
  - 定向测试输出里仍有既有 `--localstorage-file` warning，但不影响本次 marketplace 行为验证。
  - 浏览器级 marketplace 专项冒烟脚本本仓库当前没有现成命令，本次以组件级定向测试 + UI build + 下方人工验收步骤作为最小充分验证闭环。

## 发布 / 部署方式

- 本次改动属于前端 UI 行为调整，涉及公开包：
  - `@nextclaw/ui`
  - `nextclaw`
- 若和其它前端改动一起发版，先执行本记录中的测试、类型检查、构建与维护性守卫，再通过 changeset 完成版本提升与发布。
- 本次未执行独立发布。

## 用户 / 产品视角的验收步骤

1. 打开 skills marketplace 或 plugins marketplace。
2. 保持滚动发生在列表区内部，向下滚动接近底部，确认下一页会自动加载，不再需要点击分页按钮。
3. 继续向下滚动，确认已加载卡片不会闪烁消失，底部只出现轻量 loading 状态。
4. 切换到 MCP marketplace，重复同样操作，确认行为一致。
5. 输入搜索词或切换排序后，再次下滚，确认列表会从新的查询结果继续自动续拉，而不是沿用旧分页位置。
6. 切到“已安装”Tab，确认不会错误触发无限加载，已安装列表仍只在当前列表区内滚动。

## 可维护性总结汇总

- 长期目标对齐 / 可维护性推进：
  - 这次改动顺着“统一入口、统一体验”推进了一小步。用户在 marketplace 里连续浏览能力目录时，不再被分页交互打断，更接近 NextClaw 作为默认入口应有的顺滑探索体验。
- 是否已尽最大努力优化可维护性：
  - 是。本次没有改后端分页协议，也没有新造第二套 marketplace 数据层，而是直接复用现有分页接口、现有无限查询能力和现有滚动加载 hook，只把页面壳层切换到更自然的交互方式。
- 是否优先遵循“删减优先、简化优先、代码更少更好、复杂度更低更好、清晰度更高更好”的原则：
  - 是。实现优先删除底部分页条并复用既有能力，而不是叠加“分页 + 无限滚动”双轨逻辑；最终 diff 只落在 3 个既有源码文件内，没有新增页面级文件、额外 store 或额外请求层。
- 是否让总代码量、分支数、函数数、文件数或目录平铺度下降，或至少没有继续恶化：
  - 基本做到。当前 diff 的总代码净增仅 `+2` 行，且没有新增源代码文件，目录平铺度没有恶化；增长来自滚动重置兼容判断和触底加载接线，属于这次交互切换的最小必要成本。
- 抽象、模块边界、class / helper / service / store 等职责划分是否更合适、更清晰，是否避免了过度抽象或补丁式叠加：
  - 是。列表数据仍由查询 hook 负责，触底行为仍由滚动 hook 负责，页面组件只负责把“目录页”从分页交互切换成无限滚动交互，没有把滚动判定、分页状态机或接口拼接重新塞回 JSX。
- 目录结构与文件组织是否满足当前项目治理要求：
  - 部分满足。[MarketplacePage.tsx](/Users/peiwang/Projects/nextbot/packages/nextclaw-ui/src/components/marketplace/MarketplacePage.tsx) 仍是仓库既有超预算文件，[McpMarketplacePage.tsx](/Users/peiwang/Projects/nextbot/packages/nextclaw-ui/src/components/marketplace/mcp/McpMarketplacePage.tsx) 也接近预算；本次已保证前者不再继续膨胀，并把这次变化收敛在最小 diff 内。下一步可沿“把列表区交互与详情打开逻辑继续下沉到更小 section / view hook”这条 seam 再拆。
- 独立于实现阶段的可维护性复核：
  - 可维护性复核结论：保留债务经说明接受
  - 本次顺手减债：是
  - 代码增减报告：
    - 新增：11 行
    - 删除：9 行
    - 净增：+2 行
  - 非测试代码增减报告：
    - 新增：11 行
    - 删除：9 行
    - 净增：+2 行
  - no maintainability findings
  - 可维护性总结：
    - 这次改动确实让用户看到的是更顺滑的 marketplace 浏览方式，而实现层没有引入新的页面级状态机、额外协议或额外目录文件。
    - 为了避免把复杂度换地方保留，方案直接删除了分页条这一层显式交互，把行为收敛到“已有分页接口 + 已有无限查询/滚动能力”的组合上。
    - 当前保留的主要债务不是这次新引入的，而是 marketplace 页面文件本身偏大；后续继续动 marketplace 时，应优先把列表区与详情区行为再拆出更窄的 section 边界，而不是继续往页面壳里叠逻辑。
