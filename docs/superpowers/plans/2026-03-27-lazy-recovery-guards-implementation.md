# Lazy Recovery And Anchor Guard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore retry-on-reentry for failed lazy routes, enforce the zero-argument lazy loader contract at runtime, and harden raw anchor target filtering against unsafe schemes.

**Architecture:** Keep the explicit `lazyRoute(...)` API and existing lazy state machine, but clear mount-scoped failure state when the route becomes inactive. Add narrow runtime guards in `lazyRoute(...)` and `navigation.ts` so unsupported inputs are rejected at the boundary.

**Tech Stack:** Bun, TypeScript, Svelte 5 runes, JSDOM, Bun test

---

### Task 1: Capture The New Behavioral Requirements With Failing Tests

**Files:**
- Modify: `tests/route-component.test.ts`
- Modify: `tests/query-navigation-history.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that prove:
- after a lazy failure, navigating away and back retries the loader
- `lazyRoute` rejects non-zero-argument loaders
- raw anchor helpers ignore `javascript:` targets

- [ ] **Step 2: Run targeted tests to verify they fail**

Run:
- `bun test tests/route-component.test.ts`
- `bun test tests/query-navigation-history.test.ts`

Expected: FAIL on the new contract cases

### Task 2: Implement Minimal Runtime Guards

**Files:**
- Modify: `src/Route.svelte`
- Modify: `src/lazy.ts`
- Modify: `src/navigation.ts`

- [ ] **Step 1: Reset lazy failure state on deactivation**

Allow re-entry retry without reintroducing automatic retry while still active.

- [ ] **Step 2: Enforce zero-argument loader contract**

Reject non-zero-argument loader functions in `lazyRoute(...)`.

- [ ] **Step 3: Harden raw anchor filtering**

Return `null` for unsupported absolute schemes such as `javascript:`.

- [ ] **Step 4: Run targeted tests to verify they pass**

Run:
- `bun test tests/route-component.test.ts`
- `bun test tests/query-navigation-history.test.ts`

Expected: PASS

### Task 3: Final Verification

**Files:**
- Modify: `src/Route.svelte`
- Modify: `src/lazy.ts`
- Modify: `src/navigation.ts`
- Modify: `tests/route-component.test.ts`
- Modify: `tests/query-navigation-history.test.ts`

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
git add src/Route.svelte src/lazy.ts src/navigation.ts tests/route-component.test.ts tests/query-navigation-history.test.ts docs/superpowers/specs/2026-03-27-lazy-recovery-guards-design.md docs/superpowers/plans/2026-03-27-lazy-recovery-guards-implementation.md
git commit -m "fix: restore lazy route recovery guards"
```
