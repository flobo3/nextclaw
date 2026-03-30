---
title: 2026-03-31 · Cron Is Clearer Now, and One-Shot Jobs Finally Feel One-Shot
description: Cron now lists disabled jobs by default, separates disable from remove, and improves one-shot scheduling plus AI prompting clarity.
---

# 2026-03-31 · Cron Is Clearer Now, and One-Shot Jobs Finally Feel One-Shot

Published: March 31, 2026  
Tags: `improvement` `quality of life`

## What changed

- `cron list` now shows all jobs by default, including disabled ones.
- Every listed job now shows its current state, such as `[enabled]` or `[disabled]`.
- “Disable” and “remove” are now clearly separated:
  - `disable` pauses a job without deleting it.
  - `remove` permanently deletes it.
- One-shot scheduling is now treated more explicitly:
  - “Do this in 5 minutes”
  - “Remind me once at 6pm”
  - “Send one WeChat message tomorrow morning”

  These requests are now guided toward one-time `at` scheduling instead of being misread as recurring intervals.
- The AI-facing cron guidance is also clearer now. When a scheduled task needs to send a message through WeChat or another channel, the model is guided to write a runnable instruction, not just paste the final outbound text as the whole task definition.

## Why it matters

- Cron now feels more consistent across UI, CLI, and AI-driven scheduling.
- Disabled jobs no longer “disappear,” which makes recovery and troubleshooting much easier.
- Common one-shot scenarios such as reminders, follow-ups, and scheduled sends are much less likely to turn into accidental recurring jobs.
- AI-created cron jobs are now less likely to confuse “what to send” with “what the agent should do when the job runs.”

## How to use

1. Show all jobs:

```bash
nextclaw cron list
```

2. Show only enabled jobs:

```bash
nextclaw cron list --enabled-only
```

3. Disable without deleting:

```bash
nextclaw cron disable <jobId>
```

4. Remove permanently:

```bash
nextclaw cron remove <jobId>
```

5. Create a one-shot task:

```bash
nextclaw cron add -n "one-shot-wechat" -m 'At the scheduled time, send a WeChat message to the current chat saying: "Meeting starts in 5 minutes."' --at 2035-01-01T10:05:00+08:00
```

## Links

- [Cron & Heartbeat Guide](/en/guide/cron)
- [Command Reference](/en/guide/commands)
- [Configuration Guide](/en/guide/configuration)
