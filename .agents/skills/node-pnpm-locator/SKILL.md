---
name: node-pnpm-locator
description: Use when node/pnpm/npx/corepack are missing from PATH or build/test commands fail with "command not found" on macOS/Linux shells.
---

# Node Pnpm Locator

## Overview
Locate Node.js and pnpm binaries on this machine and produce a safe PATH fix or command prefix so repo commands can run reliably.

## When to Use
- `node`, `pnpm`, `npx`, or `corepack` returns `command not found`.
- CI or a non-interactive shell cannot find Node-related binaries.

Do not use if `node -v` and `pnpm -v` already succeed in the current shell.

## Quick Start
1. Run the helper script:
   - `bash /Users/peiwang/Projects/nextbot/.codex/skills/node-pnpm-locator/scripts/locate_node_pnpm.sh`
2. If it prints a PATH prefix, re-run your command with it, for example:
   - `PATH=/opt/homebrew/bin:$PATH pnpm -v`

## Workflow
1. Check current PATH resolution with `command -v`.
2. Search common locations:
   - Homebrew: `/opt/homebrew/bin`, `/usr/local/bin`
   - NVM: `~/.nvm/versions/node/*/bin`
3. Choose the fix:
   - One-off: prefix the command with `PATH=...:$PATH`.
   - Persistent: add the PATH export to `~/.zshrc` or `~/.bashrc` and restart the shell.

## Common Mistakes
- Running in a non-interactive shell that does not load your shell rc file.
- Installing Node via Homebrew/NVM but not exposing their `bin` directory in PATH.

## Resources
- `scripts/locate_node_pnpm.sh`: prints detected binaries and suggests a PATH fix.
