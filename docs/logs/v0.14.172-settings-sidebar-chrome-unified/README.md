# v0.14.172-settings-sidebar-chrome-unified

## 迭代完成说明

- 将设置侧边栏左上 header 与左下账号入口统一到同一套 settings chrome 规范，不再分别使用两组独立的字号、间距和内边距。
- 统一后的核心 token 为：`px-2.5`、`py-2`、`13px` 主文案、`11px` 次文案、`4px` 图标尺寸档。
- 保留左下账号入口的单行结构与轻量感，但让它和左上 header 在视觉语言上更一致。

## 测试 / 验证 / 验收方式

- 定向测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui test -- --run src/components/layout/sidebar.layout.test.tsx`
- 定向 lint：
  - `PATH=/opt/homebrew/bin:$PATH pnpm exec eslint packages/nextclaw-ui/src/components/layout/Sidebar.tsx packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx packages/nextclaw-ui/src/lib/i18n.remote.ts`

## 发布 / 部署方式

- 本次尚未执行发布。
- 若后续需要发布，按现有前端发布或统一 release 流程处理，并复验设置侧边栏左上 / 左下的一致性。

## 用户 / 产品视角的验收步骤

1. 打开设置侧边栏。
2. 观察左上 header 与左下账号入口。
3. 确认两者在横向 padding、纵向密度、主次字号和图标尺寸上属于同一套规范。
4. 确认左下账号入口不再显得比左上明显更大或更松，但仍比最紧版本更易读。
