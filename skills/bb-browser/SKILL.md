---
name: bb-browser
description: Use when the user wants browser-backed web data access, authenticated fetches, website adapters, or safe browser automation through a local bb-browser installation.
---

# bb-browser

## Overview

Use this skill when the user wants to use the web through their real browser session inside NextClaw.

This marketplace skill wraps the upstream `epiral/bb-browser` project for NextClaw users.

Be explicit about the boundary:

- This skill owns explanation, installation guidance, readiness checks, workflow selection, and risk disclosure.
- The local `bb-browser` CLI owns actual browser execution.
- The user's browser login state owns access to private pages and authenticated requests.

Do not pretend the environment is ready when it is not.

## What This Skill Covers

- site adapters such as `twitter/search`, `reddit/thread`, `github/repo`, `zhihu/hot`, `youtube/transcript`,
- authenticated browser-backed `fetch`,
- browser automation flows such as `open`, `snapshot`, `click`, `fill`, `eval`, `network requests`, and `screenshot`,
- local daemon mode with the user's real Chrome state,
- optional `--openclaw` path when the user already wants to run through OpenClaw's browser,
- first-use setup and bounded troubleshooting.

## What This Skill Does Not Cover

- inventing site adapters or flags that `bb-browser` does not expose,
- pretending a site command is safe when it can write, post, delete, purchase, or change account state,
- hiding missing prerequisites such as the local CLI, running browser, daemon connectivity, or login state,
- presenting third-party browser execution as native built-in NextClaw capability,
- silently creating or publishing new adapters to the upstream ecosystem.

## Install Boundary

Always distinguish these paths:

- NextClaw marketplace skill install:
  `nextclaw skills install bb-browser`
- Upstream runtime install:
  `npm install -g bb-browser`
- Optional MCP wiring outside NextClaw:
  configure `bb-browser --mcp` in the target MCP client

Installing the marketplace skill does not install the upstream runtime automatically.

## Deterministic First-Use Workflow

When the user asks for a `bb-browser` task, follow this order.

### 1. Classify the task

Choose exactly one:

- site read,
- browser read,
- browser write or account-affecting action,
- adapter authoring or reverse-engineering help.

Prefer the smallest workflow that fits the request.

### 2. Verify the CLI exists

Run:

```bash
command -v bb-browser
bb-browser --version
```

If missing, explain that the local runtime is not installed yet.

Recommended install:

```bash
npm install -g bb-browser
```

Do not continue to the real task until `bb-browser` exists.

### 3. Choose the execution path

Use exactly one of these:

- **Default daemon path**
  Use the user's local Chrome session.
- **OpenClaw path**
  Only when the user explicitly wants OpenClaw or already has that browser path ready. Every site command must include `--openclaw`.

Do not mix the two paths in one command.

### 4. Run a readiness check

For the default daemon path, ask the user to keep Chrome running, then run:

```bash
bb-browser status --json
```

If it reports `running: false` or no daemon state, try:

```bash
bb-browser daemon
```

Then re-run:

```bash
bb-browser status --json
```

Success means the daemon is running and Chrome is connected.

For the OpenClaw path, first verify `bb-browser` exists, then use a lightweight read such as:

```bash
bb-browser site list --openclaw
```

If that works, proceed with the real site task.

### 5. Run one read-only smoke before risky work

Prefer a read-only command first.

Examples:

```bash
bb-browser site list
bb-browser site info reddit/thread
bb-browser site recommend
bb-browser get title
bb-browser eval "document.title"
```

If adapter coverage is the goal, refresh the community adapter list first:

```bash
bb-browser site update
```

Do not jump straight into write actions if a small read can verify readiness first.

### 6. Execute the smallest matching command

Examples:

```bash
bb-browser site reddit/hot
bb-browser site github/repo owner/repo
bb-browser site youtube/transcript VIDEO_ID
bb-browser fetch https://example.com/api/me --json
bb-browser open https://example.com
bb-browser snapshot -i
bb-browser click @3
bb-browser fill @5 "hello"
bb-browser network requests --with-body
```

If using OpenClaw for site commands:

```bash
bb-browser site reddit/hot --openclaw
bb-browser site xueqiu/hot-stock 5 --openclaw --jq '.items[] | {name, changePercent}'
```

## Safe Execution Rules

- Prefer site adapters over manual browser clicking when both can solve the task clearly.
- Prefer read-only commands before writes.
- Treat posting, deleting, following, liking, submitting forms, changing settings, purchases, and account mutations as write actions that need explicit confirmation unless the user already gave a clear scoped instruction.
- If the request only needs information extraction, prefer `site`, `fetch`, `get`, or `eval` before `click` or `fill`.
- If using `snapshot` refs, remember that refs are temporary and must be refreshed after navigation or page changes.
- Close tabs that you opened for the task when they are no longer needed.

## Troubleshooting

### `bb-browser` not found

- Explain that the upstream CLI is not installed locally.
- Guide installation with `npm install -g bb-browser`.
- Re-check with `command -v bb-browser`.

### Daemon not running or Chrome not connected

- Ask the user to keep Chrome open.
- Run `bb-browser status --json`.
- If needed, start the daemon with `bb-browser daemon` and check status again.
- If startup still fails, be explicit that the local browser bridge is not ready yet.

### Site command fails or returns unauthorized data

- Explain that the most likely cause is missing or expired login state in the browser.
- Ask the user to log into the target site in Chrome or OpenClaw browser, then retry.

### Adapter missing or outdated

- Use:

```bash
bb-browser site list
bb-browser site search <keyword>
bb-browser site info <name>
bb-browser site update
```

- Do not claim support for an adapter you have not confirmed.

### Ref stopped working

- Explain that `@ref` values expire after navigation or DOM changes.
- Re-run:

```bash
bb-browser snapshot -i
```

### The user wants a brand new website adapter

- Be explicit that this is upstream adapter-authoring work, not guaranteed built-in support.
- Use `bb-browser guide` to inspect the upstream guide before proposing implementation steps.
- Do not claim the adapter already exists unless `site list` or `site search` proves it.

## Success Criteria

This skill is working correctly when:

- the user understands that execution is performed by the local `bb-browser` runtime,
- missing CLI, daemon, browser, or login prerequisites are identified before task execution,
- a read-only smoke succeeds before heavier workflows when appropriate,
- write actions stay behind explicit confirmation when required,
- and the final task runs only after the environment is truly ready.

## Attribution

This skill adapts the upstream `epiral/bb-browser` project for the NextClaw marketplace.
