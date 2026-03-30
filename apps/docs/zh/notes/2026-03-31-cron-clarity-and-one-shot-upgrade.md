---
title: 2026-03-31 · 定时任务更清楚了，也终于更像“定时”了
description: Cron 列表默认展示全部任务，禁用/删除彻底分开，一次性任务和 AI 调度提示也一起升级。
---

# 2026-03-31 · 定时任务更清楚了，也终于更像“定时”了

发布时间：2026-03-31  
标签：`improvement` `quality of life`

## What changed

- `cron list` 现在默认会展示全部任务，包括已经禁用的任务。
- 列表里会明确显示任务状态，例如 `[enabled]` / `[disabled]`，不再需要靠猜。
- “禁用”和“删除”彻底分开：
  - `disable` 只是暂停任务，不会删掉历史任务。
  - `remove` 才是彻底删除。
- 一次性任务体验升级：
  - “5 分钟后做一次”
  - “今晚 6 点提醒我一次”
  - “明天早上给微信发一条消息”
  
  这类需求现在会明确走单次 `at` 调度，而不是误变成“每隔 N 分钟重复一次”。
- AI 调度提示也一起加强了：当任务需要到点给微信等渠道发消息时，模型会更明确地区分“执行指令”与“最终要发出去的文案”。

## Why it matters

- 你在 UI、CLI、AI 三个入口里看到的 cron 语义终于更一致了。
- 被禁用的任务不会再“像消失了一样”，排查和恢复都会更顺手。
- 一次性提醒、一次性发送、一次性跟进这类非常常见的需求，终于不再容易被误做成周期任务。
- AI 在帮你创建任务时，也更不容易把“要发送的那句话”误当成“任务本身的执行说明”。

## How to use

1. 查看全部任务：

```bash
nextclaw cron list
```

2. 只看启用任务：

```bash
nextclaw cron list --enabled-only
```

3. 禁用但不删除：

```bash
nextclaw cron disable <jobId>
```

4. 彻底删除：

```bash
nextclaw cron remove <jobId>
```

5. 创建一次性任务：

```bash
nextclaw cron add -n "one-shot-wechat" -m 'At the scheduled time, send a WeChat message to the current chat saying: "会议还有 5 分钟开始。"' --at 2035-01-01T10:05:00+08:00
```

## Links

- [Cron 与 Heartbeat 指南](/zh/guide/cron)
- [命令参考](/zh/guide/commands)
- [配置指南](/zh/guide/configuration)
