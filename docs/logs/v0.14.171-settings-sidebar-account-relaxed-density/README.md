# v0.14.171-settings-sidebar-account-relaxed-density

## 迭代完成说明

- 将设置侧边栏底部入口文案从“账号与设备入口 / Account and Device Entry”收敛为“账号 / Account”。
- 在保持单行结构不变的前提下，略微放大该入口的视觉密度：增加纵向内边距、放大主文案字号、略微放大状态字号与图标间距，让入口不再过于紧凑。

## 测试 / 验证 / 验收方式

- 定向测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui test -- --run src/components/layout/sidebar.layout.test.tsx`
- 定向 lint：
  - `PATH=/opt/homebrew/bin:$PATH pnpm exec eslint packages/nextclaw-ui/src/components/layout/Sidebar.tsx packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx packages/nextclaw-ui/src/lib/i18n.remote.ts`

## 发布 / 部署方式

- 本次尚未执行发布。
- 若需要发布，按现有前端发布流程或统一 release 流程处理，并复验设置侧边栏账号入口文案与密度。

## 用户 / 产品视角的验收步骤

1. 打开设置侧边栏。
2. 查看底部账号入口，确认主文案显示为“账号 / Account”。
3. 确认该入口比上一版略松一点，但仍保持单行、紧凑、与设置侧边栏整体密度一致。
4. 若觉得仍然过大或不够大，可继续在这一版基础上微调，而不是回退到更厚重的旧样式。
