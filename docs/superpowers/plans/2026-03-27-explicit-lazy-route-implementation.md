# Explicit Lazy Route Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace implicit zero-argument lazy route detection with a single explicit `lazyRoute(...)` API so the router no longer executes user functions to guess whether a route is lazy.

**Architecture:** Introduce a branded lazy route definition in `src/lazy.ts`, thread that type through the public API and runtime validators, and update `Route.svelte` so it only accepts sync components or explicit lazy definitions. Treat bare zero-argument loaders as invalid configuration and migrate docs/tests to the new single lazy-route form.

**Tech Stack:** Bun, TypeScript, Svelte 5 runes, JSDOM, Bun test

---

### Task 1: Add Explicit Lazy Route Types And Public Helper

**Files:**
- Create: `src/lazy.ts`
- Modify: `src/types.ts`
- Modify: `src/index.ts`
- Modify: `tests/query-navigation-history.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that prove:
- the public entry exports `lazyRoute`
- `lazyRoute(loader)` returns a recognizable lazy route definition
- `lazyRoute` rejects non-function input with a clear error

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `bun test tests/query-navigation-history.test.ts`
Expected: FAIL because `lazyRoute` does not exist yet

- [ ] **Step 3: Write the minimal implementation**

Implement:
- `LazyRouteLoader`
- `LazyRouteDefinition`
- `lazyRoute(loader)` in `src/lazy.ts`
- public export wiring in `src/index.ts`

Keep the lazy definition shape simple and explicit, for example a branded object with `kind: 'lazy-route'` and `load`.

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `bun test tests/query-navigation-history.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lazy.ts src/types.ts src/index.ts tests/query-navigation-history.test.ts
git commit -m "feat: add explicit lazy route definition"
```

### Task 2: Switch Route Runtime To Explicit Lazy Definitions

**Files:**
- Modify: `src/route-validation.ts`
- Modify: `src/Route.svelte`
- Modify: `tests/route-component.test.ts`

- [ ] **Step 1: Write the failing tests**

Add route component tests that prove:
- `component={lazyRoute(() => import(...))}` still renders correctly
- a bare zero-argument loader passed to `component` now fails with an explicit `lazyRoute(...)` guidance error
- query-only navigation still does not restart a pending explicit lazy load

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `bun test tests/route-component.test.ts`
Expected: FAIL because `Route.svelte` still treats bare zero-argument functions as implicit lazy loaders

- [ ] **Step 3: Write the minimal implementation**

Update runtime helpers and `Route.svelte` so:
- sync components render directly
- only `LazyRouteDefinition` enters the lazy branch
- bare zero-argument functions are rejected without being executed for type probing
- resolved lazy modules still go through the existing module-shape validation

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `bun test tests/route-component.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/route-validation.ts src/Route.svelte tests/route-component.test.ts
git commit -m "fix: require explicit lazy route wrappers"
```

### Task 3: Update Documentation To The Single Supported Lazy Form

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-03-27-explicit-lazy-route-design.md`

- [ ] **Step 1: Update docs to the explicit lazy contract**

Change all lazy route examples and wording so they only show:

```svelte
import { Route, lazyRoute } from 'svelte-route';

const loadSettings = () => import('./routes/Settings.svelte');

<Route path="/settings" component={lazyRoute(loadSettings)} />
```

Also document that bare zero-argument loaders are no longer supported.

- [ ] **Step 2: Verify docs reflect the implementation**

Manually check:
- README quick start or lazy section mentions `lazyRoute`
- the spec still matches the final implementation boundary

- [ ] **Step 3: Commit**

```bash
git add README.md docs/superpowers/specs/2026-03-27-explicit-lazy-route-design.md
git commit -m "docs: document explicit lazy route api"
```

### Task 4: Full Verification

**Files:**
- Modify: `src/lazy.ts`
- Modify: `src/types.ts`
- Modify: `src/index.ts`
- Modify: `src/route-validation.ts`
- Modify: `src/Route.svelte`
- Modify: `tests/query-navigation-history.test.ts`
- Modify: `tests/route-component.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Run full verification**

Run:
- `bun test`
- `bun run typecheck`

Expected: PASS

- [ ] **Step 2: Review the git diff**

Run:
- `git diff --stat`
- `git status --short`

Confirm the change set only contains the explicit lazy-route migration plus any already-approved local work still in progress.

- [ ] **Step 3: Commit**

```bash
git add src/lazy.ts src/types.ts src/index.ts src/route-validation.ts src/Route.svelte tests/query-navigation-history.test.ts tests/route-component.test.ts README.md docs/superpowers/specs/2026-03-27-explicit-lazy-route-design.md
git commit -m "refactor: replace implicit lazy route detection"
```
