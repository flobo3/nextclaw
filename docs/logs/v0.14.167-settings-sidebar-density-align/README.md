# v0.14.167-settings-sidebar-density-align

## 迭代完成说明

- 将设置界面左侧边栏的密度重新对齐到主界面侧栏的 compact 风格，不再出现“设置页明显更松、更高”的割裂感。
- 顶部设置头部进一步收敛为更紧的工具栏式条目，缩小标题字号与上下留白，使其和主界面左栏的顶部节奏更接近。
- 设置导航项统一收敛为更紧凑的图标尺寸、文字字号、间距和垂直 padding，减少每一项的占高。
- 底部工具区同步压缩：
  - 账号入口改为更短的单行紧凑结构，保留入口名称与当前账号状态，但减少垂直占用。
  - 主题、语言、文档入口跟随使用同一套 compact 间距与字号，和主界面底部工具区保持一致的视觉密度。
- 补充回归测试，确保设置侧栏头部与底部入口继续保持 compact 样式，不会再次回退到更松散的版本：
  - [`packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx`](../../../packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx)

## 测试 / 验证 / 验收方式

- 定向单测：
  - `pnpm --filter @nextclaw/ui test -- src/components/layout/sidebar.layout.test.tsx`
- 定向 lint：
  - `pnpm exec eslint packages/nextclaw-ui/src/components/layout/Sidebar.tsx packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx`
- 类型检查：
  - `pnpm --filter @nextclaw/ui tsc`
- 构建验证：
  - `pnpm --filter @nextclaw/ui build`
- UI 冒烟（服务级）：
  - `pnpm --filter @nextclaw/ui preview -- --host 127.0.0.1 --port 4173 --strictPort`
  - `curl -I http://127.0.0.1:4173/`
  - `curl -I http://127.0.0.1:4173/model`
- 可维护性自检：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-ui/src/components/layout/Sidebar.tsx packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx`

## 发布 / 部署方式

- 本次为前端 UI 样式适配优化，无需数据库 migration 或后端发布。
- 按现有前端/桌面应用正常发布流程携带最新前端构建产物发布即可。

## 用户 / 产品视角的验收步骤

1. 打开主界面，先观察左侧边栏顶部和底部的紧凑节奏。
2. 进入设置界面，对比左侧边栏顶部区域，确认返回主界面入口、设置标题和整体留白已经更贴近主界面的 compact 风格。
3. 继续观察设置项列表，确认每个导航项的高度、文字尺寸和图标密度已经更紧凑，单屏能看到更多设置项。
4. 查看左侧底部区域，确认账号入口、主题、语言、文档入口与主界面底部工具区的密度更接近，不再显得偏高偏松。
5. 缩小窗口高度后再次检查，确认设置侧栏仍可正常滚动，顶部和底部区块保持可达。
