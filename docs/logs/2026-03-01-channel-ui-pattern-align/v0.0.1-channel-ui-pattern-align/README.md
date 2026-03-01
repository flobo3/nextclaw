# v0.0.1-channel-ui-pattern-align

## 迭代完成说明（改了什么）

- 渠道配置页面交互改为与提供商页面一致的双栏范式：
  - 左侧：筛选 Tab + 搜索 + 渠道列表
  - 右侧：固定配置面板（替代弹窗）
- 渠道图标样式对齐提供商列表规范：统一容器尺寸、边框、图标尺寸与 fallback 样式。
- 文档入口改为“按渠道专有文档展示”：当前仅飞书返回教程链接，其他渠道不展示入口。

主要文件：

- `packages/nextclaw-ui/src/components/config/ChannelsList.tsx`
- `packages/nextclaw-ui/src/components/config/ChannelForm.tsx`
- `packages/nextclaw-ui/src/lib/i18n.ts`
- `packages/nextclaw-server/src/ui/config.ts`

## 测试 / 验证 / 验收方式

```bash
pnpm build
pnpm lint
pnpm tsc
```

配置元数据冒烟（确认仅飞书有教程链接）：

```bash
pnpm -C packages/nextclaw-server exec tsx -e "import { buildConfigMeta } from './src/ui/config.ts'; import { loadConfig } from '@nextclaw/core'; const meta=buildConfigMeta(loadConfig()); console.log(meta.channels.map(c=>({name:c.name,tutorialUrl:c.tutorialUrl,tutorialUrls:c.tutorialUrls})));"
```

## 发布 / 部署方式

- 前端与 CLI 内置 UI 按常规 npm 发布流程执行：`changeset -> release:version -> release:publish`。
- 本次不涉及数据库或后端迁移，migration 不适用。

## 用户 / 产品视角验收步骤

1. 打开 UI 的 Channels 页面，确认左侧为“筛选 + 搜索 + 列表”，右侧为固定配置区域（非弹窗）。
2. 切换多个渠道，确认右侧配置区可连续编辑与保存。
3. 检查左侧渠道图标，确认大小与容器样式一致，无明显宽高失衡。
4. 检查文档入口：仅飞书渠道显示“查看指南”，其他渠道不显示。
