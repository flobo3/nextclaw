# v0.8.50-channel-layout-overflow-fix

## 迭代完成说明（改了什么）

- 修复渠道配置页在“字段很多（如飞书）”时把整页高度撑大的问题。
- 将 `Providers` / `Channels` 的双栏布局骨架抽为共享常量，避免两页布局策略漂移。
- 在共享卡片容器增加 `overflow-hidden`、`min-h-0`、`min-w-0`，确保超出内容只在卡片内部滚动，不再参与页面总高度。

核心代码：

- `packages/nextclaw-ui/src/components/config/config-layout.ts`
- `packages/nextclaw-ui/src/components/config/ChannelsList.tsx`
- `packages/nextclaw-ui/src/components/config/ChannelForm.tsx`
- `packages/nextclaw-ui/src/components/config/ProvidersList.tsx`
- `packages/nextclaw-ui/src/components/config/ProviderForm.tsx`
