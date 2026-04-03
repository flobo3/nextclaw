---
title: 2026-04-03 · 会话现在会真正带着项目一起工作
description: 新会话可以先绑定项目目录，项目 skills 会按会话加载，项目标签可直接管理，同时完成了一轮统一的 npm patch release。
---

# 2026-04-03 · 会话现在会真正带着项目一起工作

发布时间：2026-04-03  
标签：`release` `chat` `project context`

## 核心变化

- 新会话可以先设置项目目录，再发第一条消息，不需要先靠“占位消息”把 session 落盘。
- session skills 现在真正按会话项目上下文加载：
  - 读取项目下 `.agents/skills`
  - 同时保留 workspace 已安装 `skills`
  - 同名 skill 不再互相覆盖，而是通过稳定 ref 区分
- 项目自己的 `AGENTS.md` 与项目上下文会进入独立的 `Project Context` 区块，不再和 host workspace 混在一起。
- 聊天 header 里的项目 tag 现在是操作入口，不只是展示：
  - 点击即可修改项目目录
  - 点击即可移除项目目录
  - 项目切换后 skills 会立即刷新

## 解决了什么痛点

- 以前“设置了项目目录，但第一轮还没真正带上项目上下文”的问题，现在被收掉了。
- 以前“项目 skill 没加载完整，或者和 workspace 同名 skill 混掉”的问题，现在通过 session-scoped skill loading + stable ref 解决了。
- 以前“项目已经换了，但 UI 还是旧 skill 列表”的问题，现在会在项目切换后立即失效重拉。
- 以前“清除项目目录成功了，但 header tag 没消失”的交互不一致问题，也一起修掉了。

## 这次实际发了什么

这不是只补一个主包的小修，而是一轮统一 npm patch release。已发布的关键公共包包括：

- `nextclaw@0.16.32`
- `@nextclaw/core@0.11.16`
- `@nextclaw/server@0.11.23`
- `@nextclaw/ui@0.11.22`
- `@nextclaw/openclaw-compat@0.3.57`
- `@nextclaw/agent-chat-ui@0.2.20`
- `@nextclaw/channel-runtime@0.4.15`
- `@nextclaw/ncp-toolkit@0.4.16`
- `@nextclaw/ncp-react@0.4.13`
- `@nextclaw/ncp-mcp@0.1.65`
- `@nextclaw/mcp@0.1.63`
- `@nextclaw/remote@0.1.75`
- `@nextclaw/runtime@0.2.30`
- `@nextclaw/nextclaw-engine-claude-agent-sdk@0.3.14`
- `@nextclaw/nextclaw-engine-codex-sdk@0.3.15`
- `@nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk@0.1.42`
- `@nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk@0.1.42`

同时一起发布了 `channel plugins` 相关 patch 版本，保证依赖链路版本对齐，而不是只发 UI/CLI 主包。

## 我们怎么验证的

- `pnpm release:publish`
- `pnpm -C packages/nextclaw tsc`
- `pnpm -C apps/docs build`
- `pnpm lint:maintainability:guard`
- `npm view <pkg> version` 核对线上版本

## 怎么用

1. 新建一个聊天会话。
2. 先设置项目目录。
3. 打开 skill picker，确认项目下 `.agents/skills` 已出现。
4. 发送第一条消息，让模型从第一轮就带着这个项目上下文工作。
5. 需要改项目或移除项目时，直接点 header 的项目 tag。

## Links

- [聊天指南](/zh/guide/chat)
- [会话管理](/zh/guide/sessions)
- [Skills 教程](/zh/guide/tutorials/skills)
- [博客：为什么项目感知会话比再多一个 AI 功能更重要](/zh/blog/2026-04-03-why-project-aware-sessions-matter)
