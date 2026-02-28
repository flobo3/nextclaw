# v0.8.52-provider-logo-fixed-size

## 迭代完成说明（改了什么）

针对 provider 左侧图标宽度不一致，采用最直接方案：固定统一尺寸。

- `packages/nextclaw-ui/src/components/config/ProvidersList.tsx`
  - provider logo 改为固定 `h-5 w-5 object-contain`
- `packages/nextclaw-ui/src/components/common/LogoBadge.tsx`
  - 移除 `normalize` 分支逻辑，恢复单一路径渲染

## 测试 / 验证 / 验收方式

- `pnpm build`
- `pnpm lint`
- `pnpm tsc`
- UI 冒烟：打开 Providers 页面，观察列表图标大小一致

## 发布 / 部署方式

- 前端常规流程：提交后执行前端发布命令并验证页面生效

## 用户/产品视角的验收步骤

1. 打开 Providers 页面
2. 查看 OpenAI/DeepSeek/Gemini/Zhipu AI 等图标
3. 验收标准：图标尺寸一致，不再出现宽度忽大忽小
