# ITERATION v0.0.2-list-marker-parity

## 1) 迭代完成说明（改了什么）
- 修复 Markdown 列表 marker 不显示问题：显式恢复 `ul/ol` 的 `list-style-type`，覆盖 Tailwind base reset。
- 对齐主流产品列表体验：
  - `ul` 使用 `disc`，嵌套 `ul` 使用 `circle/square`
  - `ol` 使用 `decimal`，嵌套 `ol` 使用 `lower-alpha/lower-roman`
  - 统一 marker 权重与颜色（用户/助手气泡分别适配）
- 保持任务列表语义不受影响：`contains-task-list` 仍不显示默认 marker，仅展示 checkbox。

## 2) 测试/验证/验收方式
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`（通过）
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`（通过）
- 冒烟：
  - `cd packages/nextclaw-ui/dist && python3 -m http.server 4174`
  - `curl http://127.0.0.1:4174/index.html` 返回 `HTTP 200`
  - 检查构建产物 CSS 含 `list-style-type: disc/decimal` 与 `li::marker` 规则（通过）

## 3) 发布/部署方式
- UI 改动，按需执行：`pnpm release:frontend`
- 若仅本地验证，不发布则标记为“不适用”。

## 4) 用户/产品视角的验收步骤
- 在聊天中发送以下 Markdown：
  ```md
  主题如下：
  - 科技/技术分享
  - 生活感悟/随笔

  格式如下：
  1. Markdown
  2. Word
  3. PDF
  ```
- 预期：无序列表出现圆点，有序列表出现数字；多级列表出现不同 marker；任务列表显示 checkbox 而非圆点。
