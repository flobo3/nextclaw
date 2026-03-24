# v0.14.181 restore-design-system-css

## 迭代完成说明

- 恢复被误删的 `packages/nextclaw-ui/src/styles/design-system.css`，修复 `packages/nextclaw-ui/src/index.css` 中样式入口引用失效导致的前端启动失败问题。
- 确认本次修复不引入新的样式入口改动，保持现有前端主题与设计令牌来源不变。

## 测试/验证/验收方式

- 执行 `pnpm --filter @nextclaw/ui build`
- 预期结果：构建成功，不再出现 `[plugin:vite:css] [postcss] ENOENT: no such file or directory, open './styles/design-system.css'`

## 发布/部署方式

- 本次无需单独发布或部署。
- 如需联调前端，重新启动对应本地开发命令即可加载恢复后的样式文件。

## 用户/产品视角的验收步骤

- 启动前端开发环境。
- 打开前端页面，确认页面可正常加载，不再因 CSS 入口缺失而启动失败。
- 检查基础样式是否正常生效，例如页面背景、按钮、卡片和表单控件样式没有明显丢失。
