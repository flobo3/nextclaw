# Tavily Search Provider Closure Plan

## Goal

Close the existing gap between runtime-only Tavily support and the full product configuration loop so NextClaw can expose Tavily as a first-class search provider in the same unified entry used for Bocha and Brave.

## Scope

- Add Tavily to core search schema and runtime execution.
- Migrate config loading so Tavily survives `enabledProviders` normalization.
- Expose Tavily through server config view, metadata, and update APIs.
- Render Tavily in the search settings UI with its provider-specific fields.
- Add focused tests for loader migration, server config routes, UI rendering/submission, and Tavily runtime execution.

## Non-Goals

- Do not ship partial EXA support in this batch.
- Do not redesign the whole search settings architecture beyond what is needed to support one more provider cleanly.
- Do not change the default provider away from Bocha.

## Product Alignment

This work strengthens NextClaw as the unified entry for search-enabled tasks. It improves capability orchestration without pushing users into provider-specific forks or out-of-band patches, which is directly aligned with the product vision of being the natural operating layer over external services.

## Long-Term Alignment / Maintainability

- Delete-simplify first: avoid adding an EXA placeholder path that cannot run yet.
- Keep the provider extension additive but complete across schema, loader, API, UI, and tests so we do not repeat the abandoned half-merge pattern from PR #7.
- Prefer small shared helpers for provider-specific UI/config logic only where they reduce duplication immediately.
- Use this Tavily closure as the seam for future EXA integration instead of baking in new binary Bocha-vs-Brave assumptions.

## Plan

### Stage 1

Extend core search config/runtime for Tavily, including schema labels/hints and web search execution.

### Stage 2

Extend config migration, server-side search view/meta/update handling, and public API types so Tavily is preserved and editable end to end.

### Stage 3

Update the search settings page to render Tavily alongside Bocha and Brave, including Tavily-specific controls for `searchDepth` and `includeAnswer`.

### Stage 4

Run targeted tests for core, server, and UI; then run maintainability guard and a separate maintainability review before closing the task.

## Validation

- Core: schema/loader/web-search targeted tests.
- Server: search config route tests.
- UI: SearchConfig rendering and payload tests.
- Smoke readiness: document required `TAVILY_API_KEY` and the expected manual verification path once a key is provided.
