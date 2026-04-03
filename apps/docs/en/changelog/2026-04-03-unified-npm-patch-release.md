---
title: 2026-04-03 · Unified npm Patch Release for Project-Aware Sessions
description: A coordinated patch release that ships project-aware sessions, session-scoped skills, and synchronized public package updates across the npm surface.
---

# 2026-04-03 · Unified npm Patch Release for Project-Aware Sessions

Released: April 3, 2026  
Release type: `patch` `npm` `coordinated batch`

## Summary

This release is a coordinated npm patch batch, not a one-package hotfix.

It ships the recent session-scoped project context work all the way through the public surface, including the CLI, UI, server-facing packages, runtime compatibility packages, and the direct dependents that needed aligned publication.

## User-visible outcomes

- New chat sessions can bind a project before the first real message.
- Session skill loading now respects the selected project and reads `.agents/skills` from that project.
- Project and workspace skills can coexist even when they share the same display name, because selection now relies on stable refs instead of name-only merging.
- A project's own `AGENTS.md` and project context now flow into a dedicated project-context path instead of being blurred into the host workspace context.
- The project badge in chat header is now actionable, so changing or removing the bound project is faster.

## Published packages

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

## Release verification

- `pnpm release:version`
- `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:publish`
- `pnpm -C packages/nextclaw tsc`
- `pnpm -C apps/docs build`
- `pnpm lint:maintainability:guard`
- `npm view <pkg> version` checks for key published packages

Everything above passed for this release batch.

## Related reading

- [Product note: Sessions Now Actually Stay Project-Aware](/en/notes/2026-04-03-project-aware-sessions-and-unified-patch-release)
- [Blog: Why Project-Aware Sessions Matter More Than One More AI Feature](/en/blog/2026-04-03-why-project-aware-sessions-matter)
