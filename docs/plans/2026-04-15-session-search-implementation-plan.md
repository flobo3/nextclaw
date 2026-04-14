# Session Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a lightweight product-layer `session_search` feature that lets agents keyword-search prior sessions without polluting toolkit/session persistence boundaries.

**Architecture:** Add a self-contained `session-search` feature module under the NextClaw product layer. The module owns a separate SQLite-derived index, exposes a single `session_search` tool, bootstraps itself at agent startup, and incrementally reindexes on `onSessionUpdated` without spreading search logic across existing session or toolkit modules.

**Tech Stack:** TypeScript, `node:sqlite`, existing `NextclawAgentSessionStore` read model, Vitest

---

### Task 1: Create the feature module skeleton

**Files:**
- Create: `packages/nextclaw/src/cli/commands/ncp/session-search/session-search.types.ts`
- Create: `packages/nextclaw/src/cli/commands/ncp/session-search/session-search-store.service.ts`
- Create: `packages/nextclaw/src/cli/commands/ncp/session-search/session-search-index.manager.ts`
- Create: `packages/nextclaw/src/cli/commands/ncp/session-search/session-search-query.service.ts`
- Create: `packages/nextclaw/src/cli/commands/ncp/session-search/session-search.tool.ts`
- Create: `packages/nextclaw/src/cli/commands/ncp/session-search/session-search-feature.service.ts`

**Step 1: Define the feature-local types**

Create minimal types for:
- searchable document payload
- search filters and query options
- structured result object
- snippet match metadata

Keep the shapes product-oriented and avoid generic abstractions not needed by v1.

**Step 2: Add the SQLite store owner**

Implement a store service that:
- opens a dedicated DB file
- creates the required base table and FTS virtual table
- upserts/deletes indexed session documents
- executes FTS search queries
- closes the DB cleanly

The store must not know how to read `AgentSessionRecord`; it only stores/searches normalized documents.

**Step 3: Add the indexing owner**

Implement an index manager that:
- converts `AgentSessionRecord` into a compact searchable document
- includes session id, label, updatedAt and flattened searchable text
- ignores empty sessions
- sanitizes/normalizes text before persistence

Keep all “what should be indexed” decisions in this class.

**Step 4: Add the query owner**

Implement a query service that:
- accepts a plain-text query plus current-session filters
- uses the store to fetch ranked hits
- builds short text snippets around the first match
- returns a structured, agent-friendly payload

**Step 5: Add the tool wrapper**

Implement a dedicated `session_search` NCP tool with:
- `query` required
- optional `limit`
- optional `includeCurrentSession`
- clear argument validation

The tool should delegate all business logic to the query service.

### Task 2: Add the feature owner and wire it into agent bootstrap

**Files:**
- Modify: `packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.ts`
- Create: `packages/nextclaw/src/cli/commands/ncp/session-search/session-search-feature.service.ts`

**Step 1: Implement the top-level feature owner**

`SessionSearchFeatureService` should:
- initialize the DB/store
- reconcile existing sessions once at startup
- reindex on `handleSessionUpdated(sessionId)`
- delete index records when a session no longer exists
- produce a contextualized `session_search` tool for each run
- expose `dispose`

This should be the only top-level owner for the feature.

**Step 2: Wire bootstrap with minimal seams**

In `create-ui-ncp-agent.ts`:
- instantiate the feature service once
- initialize it before backend start completes
- wrap `onSessionUpdated` so existing callbacks still run
- register its contextual tool via `getAdditionalTools`
- dispose it in the returned handle cleanup

Avoid changing toolkit code, default tool registry logic, or session store responsibilities beyond this wiring.

### Task 3: Add focused tests first around the feature behavior

**Files:**
- Create: `packages/nextclaw/src/cli/commands/ncp/session-search/session-search-feature.service.test.ts`
- Modify if needed: `packages/nextclaw/src/cli/commands/ncp/session/nextclaw-ncp-tool-registry.mcp.test.ts`

**Step 1: Cover indexing and search behavior**

Add tests proving:
- user and assistant text are both indexed
- session labels participate in search
- current session is excluded by default
- current session can be included explicitly
- deleted sessions disappear from search results

**Step 2: Cover tool shape and result payload**

Add tests proving:
- tool is exposed via the runtime/tool registry path
- invalid arguments are rejected clearly
- result shape contains structured hits rather than plain strings

Prefer feature-local tests unless a thin integration assertion is needed for wiring confidence.

### Task 4: Validate, smoke-test, and record the iteration

**Files:**
- Create: `docs/logs/v0.16.16-session-search-p1/README.md`
- Update if needed: `docs/plans/2026-04-15-session-search-feature-design.md`
- Include: `docs/plans/2026-04-15-session-search-implementation-plan.md`

**Step 1: Run focused validation**

Run:
- `pnpm -C packages/nextclaw test -- --run packages/nextclaw/src/cli/commands/ncp/session-search/session-search-feature.service.test.ts packages/nextclaw/src/cli/commands/ncp/session/nextclaw-ncp-tool-registry.mcp.test.ts`
- `pnpm -C packages/nextclaw tsc`

Run additional verification only if the implementation touches wider paths.

**Step 2: Run a minimal functional smoke**

Execute a small local script or test-driven smoke path that:
- creates multiple sessions
- indexes them
- performs `session_search`
- verifies the expected session is returned

The smoke must exercise the real feature entry, not just an internal helper.

**Step 3: Run maintainability checks**

Run the smallest applicable set:
- `pnpm lint:maintainability:guard`
- maintainability self-review against feature locality, deleteability, and code growth

If repo-wide unrelated dirt blocks a check, record that clearly instead of broadening edits.

**Step 4: Record iteration output**

Create `docs/logs/v0.16.16-session-search-p1/README.md` with:
- iteration completion summary
- testing/verification/acceptance
- release/deploy notes
- user/product acceptance steps
- maintainability summary

Keep the documentation honest about what v1 includes and what remains intentionally deferred.
