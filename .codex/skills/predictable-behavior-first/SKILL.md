---
name: predictable-behavior-first
description: Use when a task involves fallbacks, backward compatibility, graceful degradation, environment-specific rescue paths, legacy retention, or "just in case" compatibility logic. Prefer explicit, clear, predictable behavior over hidden rescue paths, and require strict necessity plus exit conditions for any compatibility path.
---

# Predictable Behavior First

## Overview

Use this skill to keep system behavior explicit, clear, and predictable.

The product principle behind this skill is simple:

- We do not want surprise success.
- We do not want surprise failure.
- We do not want behavior that changes because of hidden environment state.

Use it to prevent "helpful" compatibility logic from hiding broken packaging, broken config, or broken runtime contracts.

Default stance:

- Prefer fail-fast over silent rescue.
- Prefer one clear source of truth over multiple fallback sources.
- Prefer explicit dev-only switches over automatic environment sniffing.
- Prefer fixing release/build/deploy contracts at the source over teaching shipped runtime to recognize incident signatures.

## When To Use

Trigger this skill when work includes any of these patterns:

- Adding or changing fallback paths.
- Keeping old and new implementations alive at the same time.
- Backward compatibility requests without a clearly proven need.
- Runtime behavior that depends on `cwd`, local repo files, or ambient machine state.
- Graceful degradation that can turn a broken release into a "works on my machine" illusion.
- "Just in case" retries, defaults, silent recovery, or legacy code preservation.
- A proposal to inspect stderr/stdout text, broken-version markers, or current incident signatures inside runtime code to explain or route around a release accident.

## Workflow

1. Identify the primary contract.
   For example: published npm package, packaged desktop app, public API, config schema, persisted data contract.
2. Separate shipped-runtime behavior from dev-only behavior.
   A globally installed CLI must not silently depend on repo-local artifacts unless dev mode is explicit.
3. Ask the masking question.
   Would this fallback make system behavior less predictable by hiding a packaging, config, release, or runtime bug that should fail loudly?
4. If yes, remove the fallback or gate it behind an explicit dev-only switch.
5. If compatibility still seems necessary, apply the exception bar from [references/predictable-behavior-policy.md](references/predictable-behavior-policy.md).
6. When keeping any compatibility path, record its trigger, scope, owner, and removal condition in the change summary.

## Forbidden Patch Patterns

Do not add these to shipped runtime unless the user explicitly asks for a temporary incident stopgap and you record a removal condition:

- `stderr.includes(...)` / `stdout.includes(...)` checks that recognize a current packaging, release, deploy, or upstream outage signature.
- hardcoded references to "latest release is broken", a currently bad version, or a known temporary registry accident.
- runtime branches whose only purpose is to explain, soften, or route around a broken artifact that should have been blocked by release validation.

If the problem is a broken published package, broken installer, broken deploy, or bad config contract, the default fix is:

1. fix the source contract,
2. add a guard/check in release/build/deploy flow,
3. keep runtime behavior generic and truthful.

## Decision Rules

- Behavior should be explicit, clear, and predictable.
- Do not let "works on my machine" paths redefine shipped behavior.
- Do not let production/runtime correctness depend on `cwd`.
- Do not let published artifacts borrow missing resources from source checkouts.
- Do not add silent fallbacks that turn release defects into environment-specific behavior.
- Do not encode one-off incident knowledge into runtime conditionals just because the current failure is easy to pattern-match.
- Do not keep dual paths unless the old path has a real, current, externally constrained purpose.
- If a fallback is only for development, require an explicit switch or explicit environment variable.
- If a compatibility path stays, it must have:
  - a concrete necessity,
  - a bounded scope,
  - observable signaling,
  - an exit condition.

## Output Requirements

When this skill is used, the answer should state:

- what the primary contract is,
- whether the proposed fallback makes behavior less predictable or masks a real defect,
- whether the proposal is actually an incident-specific runtime patch that should be rejected,
- whether the path is forbidden, dev-only, or temporarily allowed,
- and, if allowed, what removes it later.

## Reference

Read [references/predictable-behavior-policy.md](references/predictable-behavior-policy.md) when you need:

- the exception bar for allowing compatibility,
- concrete examples of allowed vs forbidden fallback logic,
- a compact review checklist for fallback-heavy changes.
