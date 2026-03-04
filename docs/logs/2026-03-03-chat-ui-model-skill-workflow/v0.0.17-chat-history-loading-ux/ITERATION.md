# v0.0.17 Chat History Loading Removal

## 迭代完成说明

- 按产品要求移除会话初始加载展示：历史消息加载阶段不再显示左上角文案或骨架态。
- 将历史加载时的视图改为静默占位，避免出现“加载提示堆在左上角”的体验问题。
- 保持 `ChatWelcome`、消息线程、输入栏与现有会话逻辑不变。

涉及文件：

- `packages/nextclaw-ui/src/components/chat/ChatConversationPanel.tsx`

## 测试/验证/验收方式

### 执行命令

- `pnpm -C packages/nextclaw-ui tsc`
- `pnpm -C packages/nextclaw-ui build`
- `pnpm -C packages/nextclaw-ui lint`

### 结果

- `tsc`：通过。
- `build`：通过。
- `lint`：仍有仓库既有问题（非本次引入），本次改动文件无新增 lint 报错。

## 发布/部署方式

1. 按既有流程发布前端包（如需对外发布则同步发布包含 UI 的应用包）。
2. 部署后清理缓存并刷新页面验证历史加载阶段无多余提示。

## 用户/产品视角的验收步骤

1. 打开主界面并进入一个存在历史消息的会话。
2. 刷新页面或重新进入该会话，观察历史加载阶段：不展示任何 loading 提示。
3. 验证加载完成后正常切换为真实消息列表，输入区与侧栏不抖动。
