# Route Contract And Metadata Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten `Route` configuration validation, fail loudly for invalid lazy route modules, and make repository dependency metadata reproducible without narrowing library consumer compatibility too far.

**Architecture:** Keep the current router API shape and add stricter validation at the existing boundaries. Route path validation and lazy module shape checks stay inside `Route.svelte`, while package metadata hardening is enforced through `package.json`, `bun.lock`, README notes, and regression tests that protect the policy.

**Tech Stack:** Bun, TypeScript, Svelte 5 runes, JSDOM, Bun test

---

### Task 1: Harden Route Path Validation

**Files:**
- Modify: `src/lib/Route.svelte`
- Modify: `tests/route-component.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the failing test**

Add route component tests that prove invalid `path` values fail fast:
- a bare relative path such as `user`
- a path that includes query or hash such as `/user?id=1`

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `bun test tests/route-component.test.ts`
Expected: FAIL because `Route` currently accepts any string path

- [ ] **Step 3: Write the minimal implementation**

Update `validateRouteProps()` so `path` must be `*` or an absolute pathname that:
- starts with `/`
- does not start with `//`
- does not include `?` or `#`

Update README path docs to match the runtime contract.

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `bun test tests/route-component.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/Route.svelte tests/route-component.test.ts README.md
git commit -m "fix: validate route path contracts"
```

### Task 2: Fail Loudly For Invalid Lazy Route Modules

**Files:**
- Modify: `src/lib/Route.svelte`
- Modify: `tests/route-component.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the failing test**

Add a route component test that proves a lazy loader resolving to an object without a valid `default` component export throws a clear lazy route error instead of rendering a blank screen.

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `bun test tests/route-component.test.ts`
Expected: FAIL because the lazy success path currently trusts `module.default` blindly

- [ ] **Step 3: Write the minimal implementation**

When a lazy loader resolves:
- verify the resolved value is an object
- verify `default` exists and is a function
- store a clear error in `loadError` when the module shape is invalid

Update README lazy route behavior notes to document this contract.

- [ ] **Step 4: Run targeted tests to verify they pass**

Run: `bun test tests/route-component.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/Route.svelte tests/route-component.test.ts README.md
git commit -m "fix: validate lazy route modules"
```

### Task 3: Pin Dev Dependency Metadata And Protect It

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `README.md`
- Modify: `tests/query-navigation-history.test.ts`

- [ ] **Step 1: Write the failing test**

Add metadata tests that prove:
- `devDependencies` are pinned to exact versions
- `peerDependencies` no longer use floating `latest` or `next`
- the chosen peer ranges match the intended compatibility policy

- [ ] **Step 2: Run targeted tests to verify they fail**

Run: `bun test tests/query-navigation-history.test.ts`
Expected: FAIL because the package metadata still uses floating versions

- [ ] **Step 3: Write the minimal implementation**

Update `package.json` to:
- pin `devDependencies` to the versions already resolved in `bun.lock`
- keep `peerDependencies` as compatibility ranges instead of exact pins

Refresh `bun.lock` metadata if needed and document the policy in README.

- [ ] **Step 4: Run targeted tests and metadata verification**

Run:
- `bun test tests/query-navigation-history.test.ts`
- `bun install --frozen-lockfile`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock README.md tests/query-navigation-history.test.ts
git commit -m "chore: pin development dependency metadata"
```

### Task 4: Full Verification

**Files:**
- Modify: `src/lib/Route.svelte`
- Modify: `tests/route-component.test.ts`
- Modify: `tests/query-navigation-history.test.ts`
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `README.md`

- [ ] **Step 1: Run full verification**

Run:
- `bun test`
- `bun run typecheck`

Expected: PASS

- [ ] **Step 2: Commit**

```bash
git add src/lib/Route.svelte tests/route-component.test.ts tests/query-navigation-history.test.ts package.json bun.lock README.md
git commit -m "docs: align route contracts and package metadata"
```
