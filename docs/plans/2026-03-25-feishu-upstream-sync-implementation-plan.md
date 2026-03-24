# Feishu Upstream Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make NextClaw treat `larksuite/openclaw-lark` as the Feishu upstream reference and continuously absorb nearly all high-value upstream capabilities, especially `calendar`, `task`, and `identity` (`OAuth` / acting as the authorized user), while keeping NextClaw architecture maintainable and copy-based where possible.

**Architecture:** NextClaw should not treat Feishu as a narrow chat channel. It should treat Feishu as a first-entry work surface provider. The default strategy is `vendor/copy first, rewrite only the thin OpenClaw-bound shell`, with `@nextclaw/feishu-core` becoming the shared Feishu platform layer and `@nextclaw/channel-plugin-feishu` remaining the outward Feishu plugin/tool shell.

**Tech Stack:** TypeScript, `@larksuiteoapi/node-sdk`, `@nextclaw/feishu-core`, `@nextclaw/channel-plugin-feishu`, `@nextclaw/channel-runtime`, NextClaw config/runtime/server layers, upstream reference repo `https://github.com/larksuite/openclaw-lark`

---

## Status and Decision

This document is the formal execution baseline for Feishu capability expansion as of `2026-03-25`.

It updates the narrower scope used in [2026-03-24-feishu-upstream-adoption-plan.md](./2026-03-24-feishu-upstream-adoption-plan.md):

- the old plan treated `OAuth / UAT / token store / work-surface tools` as a later phase
- the new baseline treats upstream high-value Feishu capabilities as **default in-scope**
- `calendar / task / identity` are no longer optional follow-ups; they are committed roadmap items

This plan should be read together with:

- [2026-03-24-feishu-agentos-evaluation.md](./2026-03-24-feishu-agentos-evaluation.md)
- [2026-03-24-feishu-code-reuse-architecture-design.md](./2026-03-24-feishu-code-reuse-architecture-design.md)
- [2026-03-25-feishu-upstream-capability-sync-checklist.md](./2026-03-25-feishu-upstream-capability-sync-checklist.md)

## Product Position

NextClaw's Feishu strategy is:

- not "support a Feishu chat plugin"
- but "use Feishu as a major AgentOS entry surface"

That means the capability target is not limited to:

- message ingress
- bot replies
- group/DM routing

It must expand into the core work surfaces that determine whether users can actually stay inside Feishu and finish work:

- docs
- wiki/knowledge
- drive
- base/bitable
- sheets
- calendar
- tasks
- identity and delegated execution under authorized user context

## Default Adoption Rule

The default rule is:

`If openclaw-lark has a Feishu capability and it provides clear user value, NextClaw should plan to absorb it.`

Only two classes are excluded by default:

1. capabilities with weak product value or low frequency
2. capabilities whose maintenance cost, architecture pollution, or OpenClaw coupling makes them low ROI

This is intentionally more aggressive than a typical "careful rewrite" strategy. The reason is straightforward:

- the upstream plugin already solved many Feishu-specific details
- re-deriving those details inside NextClaw would be slower and riskier
- keeping the implementation structurally close to upstream lowers future sync cost

## Engineering Rule

Implementation must follow this order of preference:

1. direct copy/vendor of pure Feishu capability code
2. copy core logic, then rewrite only the boundary adapter
3. reference behavior and tests, but do not copy the shell

The bar for refusing direct copy should be high. "We could design this more elegantly from scratch" is not enough reason to rewrite.

The bar for allowing copy is:

- it is mainly Feishu API invocation, parameter normalization, result shaping, or domain-specific logic
- it does not deeply depend on OpenClaw runtime contracts
- it does not introduce hidden fallback behavior that violates NextClaw predictability rules

## Target Architecture

### `@nextclaw/feishu-core`

This package should become the long-term Feishu platform foundation. It should own:

- account resolution
- domain/brand handling (`feishu` / `lark`)
- SDK client lifecycle
- OAuth and token primitives
- scope guard and permission diagnostics
- user identity context
- reusable Feishu OAPI capability services
- content conversion utilities

It should gradually absorb the reusable Feishu logic that does not belong in a message-channel shell.

### `@nextclaw/channel-plugin-feishu`

This package should remain the Feishu plugin/tool shell exposed to the rest of NextClaw. It should own:

- plugin registration
- tool export surface
- message-channel specific glue
- compatibility bridge to NextClaw runtime contracts

It should not become the dumping ground for all Feishu platform logic.

### `@nextclaw/channel-runtime`

This layer should stay focused on:

- ingress/egress
- routing
- session/topic/group mechanics
- channel runtime glue

It should not own Feishu work-surface business logic such as calendar/task/document CRUD.

## Capability Scope

### Already Present or Partially Present

NextClaw already has meaningful Feishu capability surface in-repo:

- message send/reply/media/streaming
- chat
- doc
- wiki
- drive
- bitable
- permission management
- scopes diagnostics

These are not the endpoint; they are the current baseline.

### Must Be Added for Near-Term Parity

The next mandatory capability additions are:

1. `calendar`
2. `task`
3. `identity`
4. `OAuth`
5. `sheets`

`identity` here means more than account selection. It includes:

- user authorization
- user-scoped token selection
- explicit distinction between bot identity and authorized user identity
- the ability to execute eligible actions as the authorized user where upstream supports it

## Migration Buckets

The authoritative first-pass migration buckets live in:

- [2026-03-25-feishu-upstream-capability-sync-checklist.md](./2026-03-25-feishu-upstream-capability-sync-checklist.md)

At a high level:

- pure OAPI tools and data shaping code should default to `可直接 copy`
- auth/context/tool-client/reply-dispatch style modules usually belong to `需薄改`
- OpenClaw lifecycle shells, one-off compatibility wrappers, and product-shell flows usually belong to `不建议迁移`

## Phase Plan

### Phase A: Lock the Adoption Contract

Purpose:

- stop future debate about whether Feishu parity is in scope
- establish `openclaw-lark` as the default upstream reference

Deliverables:

- this formal implementation plan
- the first capability sync checklist
- explicit ownership of `@nextclaw/feishu-core` as the shared Feishu platform layer

### Phase B: Fill Work-Surface Gaps

Priority order:

1. `calendar`
2. `task`
3. `sheets`

Execution rule:

- prefer upstream copy/vendor for tool bodies, schemas, parameter normalization, and result shaping
- land them first behind clear config/tool toggles
- do not wait for a perfect cross-platform abstraction before shipping Feishu value

### Phase C: Land Identity and OAuth

Priority:

- `OAuth`
- authorized-user token handling
- bot-vs-user execution context model
- capability-specific scope checks and failure messages

Execution rule:

- reusable auth/token primitives go into `@nextclaw/feishu-core`
- per-tool identity routing stays thin and explicit
- no hidden fallback from user identity to bot identity for side-effecting actions

### Phase D: Upstream Sync Loop

Once core gaps are closed, Feishu development should switch to a repeated sync model:

1. inspect upstream diff
2. classify into the three migration buckets
3. vendor pure logic quickly
4. adapt thin-boundary code
5. reject only low-value or high-pollution slices

## Execution Rules

### Rule 1: Upstream Is a Source Tree, Not a Runtime Dependency

NextClaw must not depend on the upstream Feishu plugin package at runtime.

We should:

- treat upstream as a source of truth
- vendor/copy owned code into this repo
- retain source provenance where needed

We should not:

- import deep internal files from upstream package builds
- rely on runtime wrappers over upstream internals
- hide version drift behind compatibility glue

### Rule 2: Preserve Structural Similarity Where Helpful

For high-value copied modules:

- keep names and file boundaries reasonably close to upstream when that reduces future diff cost
- convert to NextClaw TypeScript and test style
- avoid "creative cleanup" that makes future upstream sync harder without strong payoff

### Rule 3: Rewrite Only the Boundary

Typical rewrite targets are:

- plugin registration shell
- runtime injection
- config path binding
- trace/runtime context plumbing
- product-shell onboarding flows

The internal Feishu logic behind those boundaries should stay as close to upstream as practical.

### Rule 4: No Surprise Identity Fallbacks

For identity-sensitive actions:

- explicitly require the needed identity type
- fail clearly when the required identity is unavailable
- never silently downgrade to a different identity for mutating actions

This is required by NextClaw's predictable-behavior rules.

## Ownership and File Mapping

### Expected New or Expanded Areas

- `packages/extensions/nextclaw-feishu-core/src/`
- `packages/extensions/nextclaw-channel-plugin-feishu/src/`
- `packages/nextclaw-server/src/` or future tool/runtime host layer
- config schema and UI projection files that expose new Feishu capability toggles

### Typical Placement Rule

- reusable auth/client/scope/identity primitives: `nextclaw-feishu-core`
- reusable OAPI capability services: `nextclaw-feishu-core`
- user-facing Feishu tool registration surface: `nextclaw-channel-plugin-feishu`
- message transport/runtime glue: `nextclaw-channel-runtime`

## Validation Standard

For each migrated capability, validation should include:

1. schema/config validation
2. unit coverage for parameter shaping and error cases
3. account/identity routing tests where applicable
4. targeted build/lint/tsc for touched packages
5. at least one smoke path for user-visible behavior when the capability becomes runnable

For identity and OAuth work, validation must also cover:

- explicit identity-required failure paths
- scope-denied behavior
- multi-account and multi-identity routing

## Release Strategy

Release should follow incremental slices, but without losing the global parity objective.

Recommended release slices:

1. `calendar`
2. `task`
3. `sheets`
4. `identity + OAuth`
5. iterative upstream sync batches for remaining valuable capability

This ordering is not a scope reduction. It is only release slicing.

## Acceptance Criteria

This strategy is considered correctly implemented only when all of the following are true:

- `openclaw-lark` is treated as the Feishu upstream reference by default
- high-value upstream Feishu capability is presumed in-scope unless explicitly rejected
- `calendar / task / identity / OAuth / sheets` are represented as committed implementation targets
- the codebase has a stable place to host reusable Feishu platform logic
- future upstream sync can be done mostly by copy/vendor plus thin adaptation rather than broad rewrite

## Immediate Next Documents

This plan requires the checklist below as its operational companion:

- [2026-03-25-feishu-upstream-capability-sync-checklist.md](./2026-03-25-feishu-upstream-capability-sync-checklist.md)

That checklist should be updated whenever:

- upstream adds a new Feishu capability
- NextClaw absorbs a capability
- a migration bucket changes because the architecture boundary changed
