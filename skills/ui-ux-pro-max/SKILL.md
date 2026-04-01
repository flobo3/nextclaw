---
name: ui-ux-pro-max
description: Use when the user wants professional UI/UX design guidance, design-system generation, UX review, or stack-specific frontend guidance through a bundled local UI/UX Pro Max dataset and Python search runtime.
---

# UI/UX Pro Max

## Overview

Use this skill when the user wants strong UI/UX guidance inside NextClaw:

- generate a design system for a product or page,
- search styles, color palettes, typography, landing patterns, charts, or UX guidelines,
- review an existing UI for design or accessibility issues,
- or retrieve stack-specific frontend guidance for React, Next.js, Vue, Svelte, Astro, React Native, Flutter, and more.

This marketplace skill is adapted from the upstream `nextlevelbuilder/ui-ux-pro-max-skill` project and bundles the required local assets directly into the installed skill directory.

Be explicit about the boundary:

- This skill owns explanation, readiness checks, workflow selection, and safe usage guidance.
- The bundled local Python scripts own actual search and design-system generation.
- Do not pretend this is a built-in NextClaw design engine with no runtime boundary. It depends on local `python3`.

## Install Boundary: NextClaw Marketplace vs Upstream CLI

Always distinguish these paths:

- NextClaw marketplace skill install:
  `nextclaw skills install ui-ux-pro-max --workdir <workspace>`
- Installed NextClaw skill assets:
  `<workspace>/skills/ui-ux-pro-max/`
- Upstream standalone installer:
  `uipro init --ai codex`

For NextClaw users, prefer the marketplace-installed skill assets already bundled under `skills/ui-ux-pro-max/`.

Do not ask the user to install `uipro-cli` unless they explicitly want the upstream standalone ecosystem outside NextClaw.

## What This Skill Covers

- local searchable UI style guidance,
- color palette and typography discovery,
- landing page and conversion pattern guidance,
- chart and dashboard design recommendations,
- UX and accessibility review guidance,
- stack-specific implementation guidance,
- complete design-system generation,
- optional persistence of generated design-system files into a target directory.

## What This Skill Does Not Cover

- generating pixel-perfect final code by itself,
- claiming that a search result is automatically correct for the user's product without judgment,
- silently writing design files into the repo,
- replacing an existing design system without explicit user intent,
- inventing stacks, domains, or commands that the bundled runtime does not support.

## Deterministic First-Use Workflow

When the user wants to use this skill, follow this order.

### Step 0: Verify the skill assets exist

Check:

```bash
test -f skills/ui-ux-pro-max/scripts/search.py
test -f skills/ui-ux-pro-max/data/styles.csv
```

If either check fails, the skill is not correctly installed in the current workspace.

### Step 1: Verify `python3`

Run:

```bash
command -v python3
python3 --version
```

If `python3` is missing, stop and guide the user to install Python 3 first.

Do not continue to the real task until `python3` exists.

### Step 2: Run one read-only readiness smoke

Run:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "fintech dashboard accessibility" --domain ux
```

Success means:

- the command exits `0`,
- it returns at least one result or a normal empty search response,
- and there is no missing-file or import error.

### Step 3: Choose the right workflow

Choose exactly one of these based on the user goal:

- design system generation,
- domain search,
- stack-specific guidance,
- UX review,
- persisted design-system output.

Do not jump to `--persist` if the user only asked for advice or exploration.

### Step 4: Execute the smallest matching command

Prefer read-only workflows first.

Examples:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --design-system -f markdown
python3 skills/ui-ux-pro-max/scripts/search.py "glassmorphism saas" --domain style
python3 skills/ui-ux-pro-max/scripts/search.py "focus state keyboard navigation" --domain ux
python3 skills/ui-ux-pro-max/scripts/search.py "pricing table empty state" --stack react
python3 skills/ui-ux-pro-max/scripts/search.py "fintech charts accessibility" --domain chart
```

### Step 5: Ask before persistence writes

`--persist` writes files such as `design-system/<project>/MASTER.md`.

Only use it when the user explicitly wants generated design-system files saved into a project.

Recommended explicit form:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --design-system --persist -p "Serenity Spa" -o .
```

Or choose an explicit target directory:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --design-system --persist -p "Serenity Spa" -o <target-project-root>
```

## Search Modes

### Design system generation

Use when the user wants a full design direction for a new product, page, or redesign.

Command:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system -f markdown
```

### Domain search

Use when the user wants a focused answer.

Available domains:

- `style`
- `color`
- `chart`
- `landing`
- `product`
- `ux`
- `typography`
- `icons`
- `react`
- `web`
- `google-fonts`

Command:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>
```

### Stack guidance

Use when the user needs implementation-aware guidance for a specific stack.

Available stacks:

- `react`
- `nextjs`
- `vue`
- `svelte`
- `astro`
- `swiftui`
- `react-native`
- `flutter`
- `nuxtjs`
- `nuxt-ui`
- `html-tailwind`
- `shadcn`
- `jetpack-compose`
- `threejs`
- `angular`
- `laravel`

Command:

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --stack <stack>
```

## Safe Usage Rules

- Treat search and non-persisted design-system generation as read-only.
- Treat `--persist` as a write action and ask for explicit confirmation unless the user already asked to save output.
- When working inside an existing product or design system, preserve established patterns unless the user asks for a more radical redesign.
- Do not present a generated palette, style, or pattern as mandatory truth. Present it as a recommendation with rationale.
- If the user asks for code changes, use the search output as guidance, then implement in the target codebase with normal engineering judgment.

## Troubleshooting

### `python3` not found

- Explain that the bundled skill depends on local Python 3.
- Guide the user to install Python 3 for their platform.
- Re-run `command -v python3` and the readiness smoke.

### Missing file or import error

- Verify the skill is actually installed in the active workspace.
- Re-check:

```bash
test -f skills/ui-ux-pro-max/scripts/search.py
test -f skills/ui-ux-pro-max/data/ui-reasoning.csv
```

- If missing, reinstall the marketplace skill instead of inventing fallback paths.

### Search returns weak or irrelevant results

- Narrow the query with stronger product, audience, or platform terms.
- Prefer domain search over a vague general query.
- Try stack-specific search for implementation guidance.

### Persisted files land in the wrong place

- Use an explicit output directory with `-o <target-project-root>`.
- Do not silently write into an unexpected repo.

## Success Criteria

This skill is working correctly when:

- the user can get design guidance without installing the upstream standalone CLI,
- `python3` and the bundled assets are verified before use,
- read-only guidance works through the local search script,
- persisted design-system files are only written with clear user intent,
- and the skill stays honest about its local runtime boundary.

## Attribution

This skill is adapted from:

- `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`

The bundled upstream license text is included in `skills/ui-ux-pro-max/UPSTREAM_LICENSE`.
