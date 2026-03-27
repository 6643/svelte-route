# Lazy Retry Stop Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent failed explicit lazy loaders from being retried automatically during the same mounted route lifecycle.

**Architecture:** Keep the current explicit lazy-route API and current promise reuse behavior, but add a mount-scoped failure state in `Route.svelte` so failed loaders become a terminal state instead of re-entering the lazy branch on the next effect pass.

**Tech Stack:** Bun, TypeScript, Svelte 5 runes, JSDOM, Bun test

---

### Task 1: Capture The Regression With A Failing Test

**Files:**
- Modify: `tests/route-component.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test that proves:
- an active lazy loader that rejects is not called again automatically during the same mount

- [ ] **Step 2: Run targeted tests to verify it fails**

Run: `bun test tests/route-component.test.ts`
Expected: FAIL because the loader is currently retried

### Task 2: Implement Minimal Failure Terminal State

**Files:**
- Modify: `src/Route.svelte`

- [ ] **Step 1: Add mount-scoped lazy failure state**

Prevent the lazy branch from calling the loader again after a same-mount failure.

- [ ] **Step 2: Keep current guarantees intact**

Do not break:
- in-flight promise reuse
- inactive failure suppression
- clear non-promise loader errors

- [ ] **Step 3: Run targeted tests to verify they pass**

Run: `bun test tests/route-component.test.ts`
Expected: PASS

### Task 3: Final Verification

**Files:**
- Modify: `src/Route.svelte`
- Modify: `tests/route-component.test.ts`

- [ ] **Step 1: Run full verification**

Run:
- `bun test`
- `bun run typecheck`

Expected: PASS

- [ ] **Step 2: Review final diff**

Run:
- `git diff --stat`
- `git status --short`

- [ ] **Step 3: Commit**

```bash
git add src/Route.svelte tests/route-component.test.ts docs/superpowers/specs/2026-03-27-lazy-retry-stop-design.md docs/superpowers/plans/2026-03-27-lazy-retry-stop-implementation.md
git commit -m "fix: stop implicit retries for failed lazy loaders"
```
