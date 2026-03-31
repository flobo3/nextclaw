# v0.15.4-chat-enter-noeffect-while-running

## 迭代完成说明（改了什么）

- 调整 `@nextclaw/ncp-react-ui` 的原生 `textarea` 输入逻辑：当会话处于运行中、输入区展示 `stop` 按钮时，按 `Enter` 只会被拦截，不再触发发送，也不再触发停止。
- 调整 `@nextclaw/agent-chat-ui` 的富编辑器键盘决策：当消息仍在发送 / 回复中时，普通 `Enter` 会被消费为“无效果”，不会发送消息、不会停止生成、不会插入额外内容。
- 调整 `@nextclaw/ui` 的旧版 `chat-input-bar.controller` 行为，使其在发送中同样拦截普通 `Enter`，保证不同聊天输入链路的语义一致。
- 补充回归测试，锁定“发送中回车无效果”的键盘行为。

## 测试 / 验证 / 验收方式

- 单测：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui test -- chat-composer-keyboard.utils.test.ts`
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C packages/nextclaw-ui test -- chat-input-bar.controller.test.tsx`
- 类型检查：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui tsc`
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm -C packages/ncp-packages/nextclaw-ncp-react-ui tsc`
- UI 冒烟：
  - 启动 `apps/ncp-demo` 前后端后，通过 Playwright 定制脚本验证：
    - 第二条消息进入运行中状态后，`Enter` 不会新增用户消息。
    - 输入框内容在按下 `Enter` 前后保持不变。
    - `stop` 按钮保持可见，证明未被误触发为停止。
  - 结果：通过，输出 `messageCount=2, value=\"\", stopVisible=true`。
- Maintainability Guard：
  - `PATH=/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm lint:maintainability:guard`
  - 结果：本次触达的键盘处理函数红灯已消除；当前仍有与本次任务无关的既有并行改动阻塞，集中在 `packages/nextclaw-ui/src/components/chat/adapters/chat-message.adapter.ts`。
- 不适用项：
  - `packages/nextclaw-ui` 整包 `tsc` 本轮未通过，但失败点同样落在 `chat-message.adapter.ts` 的并行改动，不是本次回车修正引入。

## 发布 / 部署方式

- 本次为前端交互修正，无数据库或后端 migration。
- 若需要随前端版本发布，按既有前端发布流程执行即可：
  - 构建 / 校验受影响前端包
  - 执行前端发布闭环
  - 上线后复跑“发送中按 Enter 无效果”的页面冒烟

## 用户 / 产品视角的验收步骤

1. 打开聊天页面，先发送一条会触发较长回复的消息，让输入区右侧出现 `stop` 按钮。
2. 在回复尚未结束时，把光标放在输入框中按一次 `Enter`。
3. 观察结果：
   - 不会发送新消息。
   - 不会停止当前回复。
   - 输入框内容不会发生变化。
4. 等回复结束后再次按 `Enter`，应恢复正常发送语义。
