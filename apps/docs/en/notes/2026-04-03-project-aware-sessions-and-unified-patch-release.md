---
title: 2026-04-03 · Sessions Now Actually Stay Project-Aware
description: New sessions can bind a project before the first message, project skills now load per session, the project badge is actionable, and this ships in one unified npm patch release.
---

# 2026-04-03 · Sessions Now Actually Stay Project-Aware

Published: April 3, 2026  
Tags: `release` `chat` `project context`

## Core changes

- New sessions can bind a project before the first real message. No more dummy first turn just to make project context stick.
- Session skills now load from the session's actual project context:
  - read `.agents/skills` from the selected project
  - keep workspace-installed `skills`
  - distinguish same-name skills by stable refs instead of merging by display name
- A project's own `AGENTS.md` and project context now flow into a dedicated `Project Context` block.
- The project badge in chat header is now actionable:
  - change the project directory there
  - remove the project there
  - refresh skills immediately after project changes

## Problems this fixes

- Project context no longer waits for a first persisted message to become real.
- Project skills no longer silently disappear or get mixed with same-name workspace skills.
- Skill lists now refresh immediately after project changes instead of showing stale data.
- Removing project context now updates the visible header state consistently.

## What actually shipped

This is a coordinated npm patch release, not a one-package hotfix. Key published packages include:

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

Related channel plugin patches were published in the same batch to keep dependency alignment clean.

## Verification

- `pnpm release:publish`
- `pnpm -C packages/nextclaw tsc`
- `pnpm -C apps/docs build`
- `pnpm lint:maintainability:guard`
- `npm view <pkg> version` checks against published versions

## How to use

1. Start a new chat session.
2. Set the project directory first.
3. Open the skill picker and confirm that `.agents/skills` from the project is already available.
4. Send the first message and let the model work in that project context from turn one.
5. Change or remove the project later from the header badge.

## Links

- [Chat Guide](/en/guide/chat)
- [Session Management](/en/guide/sessions)
- [Skills Tutorial](/en/guide/tutorials/skills)
- [Blog: Why Project-Aware Sessions Matter More Than One More AI Feature](/en/blog/2026-04-03-why-project-aware-sessions-matter)
