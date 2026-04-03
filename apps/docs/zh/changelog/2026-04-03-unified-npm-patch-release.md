---
title: 2026-04-03 · 项目感知会话统一 npm Patch 发布
description: 这是一轮统一的 npm patch 发布，不是只补一个主包，而是把项目感知会话相关改动与直接受影响公共包一次性同步发出。
---

# 2026-04-03 · 项目感知会话统一 npm Patch 发布

发布时间：2026-04-03  
发布类型：`patch` `npm` `统一批次`

## 发布摘要

这次不是“只发一个包看看”的小修，而是一轮统一的 npm patch release。

它把最近这批 session-scoped project context 相关能力，真正从实现层推进到了对外 npm 包层，包括 CLI、UI、server 相关包、runtime 兼容层，以及所有为了依赖版本对齐必须同步发布的直接受影响公共包。

## 用户可感知结果

- 新会话现在可以先绑定项目目录，再发第一条真正的消息。
- 会话技能加载现在会按项目读取对应 `.agents/skills`。
- 就算项目 skill 和 workspace skill 同名，也不会再因为只按名字匹配而互相覆盖。
- 项目自己的 `AGENTS.md` 和项目上下文会走独立 project context 链路，不再和 host workspace 混在一起。
- 聊天 header 里的项目标签现在可以直接操作，修改和移除项目目录都更顺手。

## 本次已发布包

- `nextclaw@0.16.32`
- `@nextclaw/core@0.11.16`
- `@nextclaw/server@0.11.23`
- `@nextclaw/ui@0.11.22`
- `@nextclaw/openclaw-compat@0.3.57`
- `@nextclaw/agent-chat-ui@0.2.20`
- `@nextclaw/channel-runtime@0.4.15`
- `@nextclaw/channel-plugin-dingtalk@0.2.29`
- `@nextclaw/channel-plugin-discord@0.2.29`
- `@nextclaw/channel-plugin-email@0.2.29`
- `@nextclaw/channel-plugin-mochat@0.2.29`
- `@nextclaw/channel-plugin-qq@0.2.29`
- `@nextclaw/channel-plugin-slack@0.2.29`
- `@nextclaw/channel-plugin-telegram@0.2.29`
- `@nextclaw/channel-plugin-wecom@0.2.29`
- `@nextclaw/channel-plugin-weixin@0.1.23`
- `@nextclaw/channel-plugin-whatsapp@0.2.29`
- `@nextclaw/mcp@0.1.63`
- `@nextclaw/ncp-mcp@0.1.65`
- `@nextclaw/ncp-react@0.4.13`
- `@nextclaw/ncp-toolkit@0.4.16`
- `@nextclaw/nextclaw-engine-claude-agent-sdk@0.3.14`
- `@nextclaw/nextclaw-engine-codex-sdk@0.3.15`
- `@nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk@0.1.42`
- `@nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk@0.1.42`
- `@nextclaw/remote@0.1.75`
- `@nextclaw/runtime@0.2.30`

## 发布验证

- `pnpm release:version`
- `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:publish`
- `pnpm -C packages/nextclaw tsc`
- `pnpm -C apps/docs build`
- `pnpm lint:maintainability:guard`
- 对关键包执行 `npm view <pkg> version`

上述验证本轮都已通过。

## 延伸阅读

- [更新笔记：会话现在会真正带着项目一起工作](/zh/notes/2026-04-03-project-aware-sessions-and-unified-patch-release)
- [博客：为什么项目感知会话比再多一个 AI 功能更重要](/zh/blog/2026-04-03-why-project-aware-sessions-matter)
