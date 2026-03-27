# Inactive Lazy Error Suppression Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop inactive lazy-route failures from throwing into the current screen while preserving explicit lazy loader promise reuse and existing route behavior.

**Architecture:** Keep the current explicit lazy-route API and in-flight promise caching, but tighten the settlement path so only still-active lazy routes are allowed to publish resolved components or surfaced errors.

**Tech Stack:** Bun, TypeScript, Svelte 5 runes, JSDOM, Bun test

---

### Task 1: Capture The Regression With Failing Tests

**Files:**
- Modify: `tests/route-component.test.ts`

- [ ] **Step 1: Write the failing test**

Add a route component test that proves:
- after `/lazy -> /other`, rejecting the pending loader does not throw into the current page

- [ ] **Step 2: Run targeted tests to verify it fails**

Run: `bun test tests/route-component.test.ts`
Expected: FAIL on the new inactive-route error case

- [ ] **Step 3: Commit**

```bash
git add tests/route-component.test.ts
git commit -m "test: capture inactive lazy error regression"
```

### Task 2: Implement Minimal Settlement Guard

**Files:**
- Modify: `src/Route.svelte`

- [ ] **Step 1: Implement active-settlement guarding**

Ensure lazy promise handlers only publish `resolvedComponent` or `loadError` when the route is still active at settlement time.

- [ ] **Step 2: Preserve pending promise lifecycle**

Make sure pending promise cleanup still happens and does not regress the existing “do not restart pending load” behavior.

- [ ] **Step 3: Run targeted tests to verify they pass**

Run: `bun test tests/route-component.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/Route.svelte tests/route-component.test.ts
git commit -m "fix: ignore lazy failures after route deactivation"
```

### Task 3: Update Docs And Run Full Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-03-27-inactive-lazy-error-design.md`

- [ ] **Step 1: Update docs if needed**

If README behavior notes mention lazy failure behavior, align them with the final implementation.

- [ ] **Step 2: Run full verification**

Run:
- `bun test`
- `bun run typecheck`

Expected: PASS

- [ ] **Step 3: Review final diff**

Run:
- `git diff --stat`
- `git status --short`

- [ ] **Step 4: Commit**

```bash
git add src/Route.svelte tests/route-component.test.ts README.md docs/superpowers/specs/2026-03-27-inactive-lazy-error-design.md docs/superpowers/plans/2026-03-27-inactive-lazy-error-implementation.md
git commit -m "docs: align inactive lazy error behavior"
```
