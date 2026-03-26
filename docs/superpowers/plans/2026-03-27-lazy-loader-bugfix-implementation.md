# Lazy Loader Bugfix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix lazy-route reactivation from restarting pending loads and restore clear router-owned errors for invalid non-promise lazy loaders.

**Architecture:** Keep the explicit `lazyRoute(...)` API unchanged. Add minimal in-flight promise caching inside `Route.svelte`, re-use `isPromiseLike(...)` for explicit lazy loaders, and cover both fixes with targeted regression tests.

**Tech Stack:** Bun, TypeScript, Svelte 5 runes, JSDOM, Bun test

---

### Task 1: Lock In Reproduction With Failing Tests

**Files:**
- Modify: `tests/route-component.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that prove:
- leaving and re-entering a pending lazy route does not call the loader twice
- `lazyRoute(() => null as never)` fails with a clear lazy loader error rather than a raw `TypeError`

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `bun test tests/route-component.test.ts`
Expected: FAIL on the two new regressions

- [ ] **Step 3: Commit**

```bash
git add tests/route-component.test.ts
git commit -m "test: capture lazy loader regressions"
```

### Task 2: Implement Minimal Lazy State Fixes

**Files:**
- Modify: `src/Route.svelte`

- [ ] **Step 1: Implement in-flight promise caching**

Ensure the lazy loader is only called once per unresolved activation cycle and that reactivation before resolution reuses the same promise.

- [ ] **Step 2: Restore promise validation**

Use `isPromiseLike(...)` on the explicit lazy loader result and emit a router-owned error when the loader result is invalid.

- [ ] **Step 3: Run targeted tests to verify they pass**

Run: `bun test tests/route-component.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/Route.svelte tests/route-component.test.ts
git commit -m "fix: stabilize explicit lazy loader behavior"
```

### Task 3: Update Docs And Run Full Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-03-27-lazy-loader-bugfix-design.md`

- [ ] **Step 1: Update docs**

Document that explicit lazy loaders must return a promise and that the router reuses the in-flight load during reactivation.

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
git add src/Route.svelte tests/route-component.test.ts README.md docs/superpowers/specs/2026-03-27-lazy-loader-bugfix-design.md docs/superpowers/plans/2026-03-27-lazy-loader-bugfix-implementation.md
git commit -m "docs: align lazy loader bugfix behavior"
```
