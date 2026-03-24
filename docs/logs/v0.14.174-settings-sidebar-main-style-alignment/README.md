# v0.14.174-settings-sidebar-main-style-alignment

## 迭代完成说明

- 将设置界面左侧边栏的顶部区域改为与主界面一致的视觉语言：统一使用 `BrandHeader`，并补充与主界面 utility row 同风格的“返回主界面”入口。
- 将设置界面的导航项、底部 utility 区、账号入口的间距、字号、圆角、图标尺寸统一到主界面侧边栏的同一套样式 token，避免主界面与设置界面分别维护两套密度规范。
- 更新侧边栏布局测试，改为校验设置侧边栏与主界面在顶部层级和底部密度上的一致性；同时通过 mock `BrandHeader` 去除无关 query provider 依赖，让测试聚焦布局契约。

## 测试/验证/验收方式

- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui test -- --run src/components/layout/sidebar.layout.test.tsx`
- `PATH=/opt/homebrew/bin:$PATH pnpm exec eslint packages/nextclaw-ui/src/components/layout/Sidebar.tsx packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx packages/nextclaw-ui/src/lib/i18n.remote.ts`
- `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-ui/src/components/layout/Sidebar.tsx packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx packages/nextclaw-ui/src/lib/i18n.remote.ts`

## 发布/部署方式

- 本次为前端 UI 样式与测试调整，按常规前端发布流程随下一次 `nextclaw-ui` 相关发布一并进入构建产物即可。
- 若需要单独发布前端变更，执行项目既有前端发布流程，并在发布后重点回归主界面与设置界面的左侧边栏一致性。

## 用户/产品视角的验收步骤

1. 启动应用并进入主界面，记录左侧边栏顶部品牌区、导航项密度、底部 utility 区和账号入口的视觉样式。
2. 进入设置界面，确认左侧顶部同样展示品牌区，并提供与主界面同风格的“返回主界面”入口。
3. 对比主界面与设置界面的导航项、图标尺寸、字号、左右内边距、底部 utility 区和账号入口，确认它们遵循同一套规范，不再出现一边明显更紧凑、一边明显更松散的情况。
