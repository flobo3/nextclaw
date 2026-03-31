# v0.14.325-cron-relative-time-current-time-prompt

## 迭代完成说明

- 优化 `cron` 相关提示链路，明确要求模型在处理“1分钟后 / in 5 minutes”这类相对时间定时时，先通过现有工具获取当前本地时间，再换算为带时区的绝对 `ISO datetime`，禁止拍脑袋猜测。
- 在运行时系统提示中增加相对时间定时约束，降低模型直接猜当前时间导致 `cron at` 错位的概率。
- 在 `cron` 工具描述与 `cron` skill 中补充同一约束，确保模型在看工具 schema 或技能说明时都能拿到一致提示。
- 补充对应测试，验证系统提示与 `cron` 工具描述中都包含“先查当前时间再换算”的约束。

## 测试/验证/验收方式

- 运行：`PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/core test -- src/agent/context.test.ts src/agent/tools/cron.test.ts`
- 结果：通过，`2` 个测试文件、`13` 个测试用例全部通过。
- 运行：`PATH=/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard`
- 结果：未通过，但失败原因为仓库中其它未提交改动触发的目录预算守卫：
  `packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-message-list`
  与本次 `cron` 提示改动无直接关联。

## 发布/部署方式

- 本次为提示词与测试改动，无需单独部署。
- 按常规代码合并流程发布下一次 CLI/runtime 版本即可随版本生效。

## 用户/产品视角的验收步骤

1. 在聊天里让 AI 设置一次性定时，例如“1分钟后提醒我开会”。
2. 观察 AI 在设置 `cron` 时，应先使用现有命令执行能力获取当前时间，或明确依据当前时间提示换算，而不是直接猜测绝对时间。
3. 检查最终生成的 `at` 时间，应与当前本地时间加上请求偏移量一致，并且带正确时区。
4. 再测试类似“5分钟后发微信给我”这类场景，确认 AI 仍会先取当前时间，再创建一次性任务。
