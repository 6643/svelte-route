# Router Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden router-managed history and route registration so the runtime remains bounded, rejects foreign history state, and avoids unnecessary rerenders during route registration.

**Architecture:** Keep the public router API unchanged and concentrate the hardening inside the existing runtime helpers. Add ownership metadata and bounded stack trimming in `history.ts`, thread that through `router.svelte.ts`, and tighten runtime notifications so only match changes trigger rerenders during route registration.

**Tech Stack:** Bun, TypeScript, Svelte 5 runes, JSDOM, Bun test

---

### Task 1: Harden Managed History State

**Files:**
- Modify: `src/lib/history.ts`
- Modify: `src/lib/types.ts`
- Test: `tests/query-navigation-history.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that prove:
- `normalizeHistoryState()` repairs a valid-shape state created by a different owner
- `buildPushState()` trims managed history to `MAX_MANAGED_HISTORY_ENTRIES`
- trusted managed history keeps its signature and survives normalization

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `bun test tests/query-navigation-history.test.ts`
Expected: FAIL because owner-aware history helpers and bounded stack behavior do not exist yet

- [ ] **Step 3: Write the minimal implementation**

Implement:
- a managed history owner factory
- signature generation and validation for router-managed `__route`
- bounded stack trimming that preserves the current entry
- updated route history types including signature metadata

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `bun test tests/query-navigation-history.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/history.ts src/lib/types.ts tests/query-navigation-history.test.ts
git commit -m "fix: harden managed history state"
```

### Task 2: Reduce Registration Fan-Out

**Files:**
- Modify: `src/lib/router.svelte.ts`
- Test: `tests/router-runtime.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that prove:
- registering or unregistering unmatched routes does not notify subscribers
- registering a fallback or exact route that changes the active match does notify subscribers

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `bun test tests/router-runtime.test.ts`
Expected: FAIL because `registerRoute()` currently notifies on every add/remove

- [ ] **Step 3: Write the minimal implementation**

Refactor route matching into a reusable helper and update `registerRoute()` so it only invalidates and notifies when the active match actually changes.

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `bun test tests/router-runtime.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/router.svelte.ts tests/router-runtime.test.ts
git commit -m "perf: avoid redundant route registration rerenders"
```

### Task 3: Integrate and Verify Runtime Behavior

**Files:**
- Modify: `src/lib/router.svelte.ts`
- Modify: `README.md`
- Test: `tests/router-runtime.test.ts`
- Test: `tests/query-navigation-history.test.ts`

- [ ] **Step 1: Write any remaining failing integration test**

If needed, add a runtime test that proves `popstate` repairs foreign-but-valid managed history state through the full router runtime.

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `bun test tests/router-runtime.test.ts tests/query-navigation-history.test.ts`
Expected: FAIL until router runtime passes owner-aware history helpers through all code paths

- [ ] **Step 3: Write the minimal integration changes**

Update runtime initialization, navigation, test reset, and README behavior notes so:
- runtime-owned history state is generated consistently
- repaired history state is written back to the browser
- bounded managed history behavior is documented

- [ ] **Step 4: Run full verification**

Run:
- `bun test`
- `bun run typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/router.svelte.ts README.md tests/router-runtime.test.ts tests/query-navigation-history.test.ts
git commit -m "docs: document router hardening semantics"
```
