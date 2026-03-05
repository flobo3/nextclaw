# ITERATION v0.0.1-chat-markdown-world-class

## 1) 迭代完成说明（改了什么）
- 升级 `ChatThread` Markdown 渲染层：补齐安全链接处理、任务列表 checkbox 渲染、表格容器滚动、图片懒加载、代码块语言识别。
- 新增代码块工具栏：显示语言标签 + 一键复制代码（含“已复制”反馈）。
- 重构聊天 Markdown 视觉体系：标题层级、列表间距、引用块、表格、行内代码、代码块、链接、分隔线统一样式，分别适配用户/助手气泡。
- 新增 i18n 文案：`chatCodeCopy`、`chatCodeCopied`。

## 2) 测试/验证/验收方式
- 开发验证：
  - `pnpm -C packages/nextclaw-ui build`
  - `pnpm -C packages/nextclaw-ui lint`
  - `pnpm -C packages/nextclaw-ui tsc`
- 冒烟测试（UI 可运行最小路径）：
  - 启动预览并检查可访问性：`pnpm -C packages/nextclaw-ui preview --host 127.0.0.1 --port 4174`
  - 访问 `http://127.0.0.1:4174`，确认返回 200 且页面可加载。
  - 在会话中发送包含标题/列表/任务列表/表格/代码块/链接的 Markdown，确认渲染和复制行为正确。

## 3) 发布/部署方式
- 本次为 UI 体验增强，按需执行前端发布闭环：
  - `pnpm release:frontend`
- 若仅本地验证，不执行发布则标记为“不适用”。

## 4) 用户/产品视角的验收步骤
- 打开聊天页面，发送一段复杂 Markdown（含 `#` 标题、`- [ ]` 任务项、表格、``` 代码块、链接）。
- 验证排版层级、颜色对比、间距是否接近主流顶级产品体验。
- 在代码块右上角点击“复制”，验证按钮反馈从“复制”变“已复制”。
- 验证长表格可横向滚动，链接可正常打开且不影响当前会话。
