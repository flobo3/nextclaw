# v0.14.339 Nextclaw UI Logo Paw Overlay

## 迭代完成说明（改了什么）
- 调整 `nextclaw-ui` 的品牌图标为“原始图标 + 右下角 `🐾` 叠加”样式，避免整张图标被 emoji 主体替换：
  - 更新 [`packages/nextclaw-ui/public/logo.svg`](packages/nextclaw-ui/public/logo.svg)
  - 同步更新 [`packages/nextclaw/ui-dist/logo.svg`](packages/nextclaw/ui-dist/logo.svg)
- 进一步按“emoji 艺术字”方式优化 `🐾` 文本层：增加轻微旋转与阴影，使视觉更接近贴字效果，同时不遮挡主图标。

## 测试/验证/验收方式
- 资源内容校验：
  - `rg -n "🐾" packages/nextclaw-ui/public/logo.svg packages/nextclaw/ui-dist/logo.svg`
  - `git diff -- packages/nextclaw-ui/public/logo.svg packages/nextclaw/ui-dist/logo.svg`
- 结果：两个图标文件均包含右下角 `🐾` 叠加层，主体图形保持原样。

## 发布/部署方式
- 本次仅完成资源文件修改，未执行发布。
- 若需上线，按前端既有发布流程执行并验证图标缓存刷新。

## 用户/产品视角的验收步骤
1. 打开 nextclaw-ui 页面并刷新缓存。
2. 确认页面使用的品牌图标仍是原始深色底 + 线条符号。
3. 确认图标右下角出现 `🐾` 叠加，不遮挡主体。
