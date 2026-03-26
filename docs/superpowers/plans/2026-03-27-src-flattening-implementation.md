# `src/lib` To `src` Flattening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flatten the production source layout from `src/lib/*` to `src/*` while preserving runtime behavior, public package behavior, and current test semantics.

**Architecture:** Treat this as a pure path migration. Move production source files to `src/`, update source imports and package metadata, then update tests and active docs so the repository no longer depends on `src/lib/`.

**Tech Stack:** Bun, TypeScript, Svelte 5 runes, JSDOM, Bun test

---

### Task 1: Move Production Source Files And Rewrite Internal Imports

**Files:**
- Move: `src/lib/index.ts` -> `src/index.ts`
- Move: `src/lib/Route.svelte` -> `src/Route.svelte`
- Move: `src/lib/history.ts` -> `src/history.ts`
- Move: `src/lib/navigation.ts` -> `src/navigation.ts`
- Move: `src/lib/query.ts` -> `src/query.ts`
- Move: `src/lib/router.svelte.ts` -> `src/router.svelte.ts`
- Move: `src/lib/route-validation.ts` -> `src/route-validation.ts`
- Move: `src/lib/types.ts` -> `src/types.ts`
- Move: `src/lib/lazy.ts` -> `src/lazy.ts`

- [ ] **Step 1: Move the source files**

Use git moves so history stays readable.

- [ ] **Step 2: Rewrite internal imports**

Update moved files so all intra-source relative imports still resolve from `src/`.

- [ ] **Step 3: Run a focused typecheck**

Run: `bun run typecheck`
Expected: FAIL or partially fail only on remaining old paths outside moved source files

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "refactor: flatten library source layout"
```

### Task 2: Update Public Metadata, Tests, And Fixtures

**Files:**
- Modify: `package.json`
- Modify: `tests/query-navigation-history.test.ts`
- Modify: `tests/route-component.test.ts`
- Modify: `tests/router-runtime.test.ts`
- Modify: `tests/fixtures/*.svelte`
- Modify: `tests/helpers/compile-svelte.ts`

- [ ] **Step 1: Rewrite package export path**

Change the package export target from `./src/lib/index.ts` to `./src/index.ts`.

- [ ] **Step 2: Rewrite test and fixture source paths**

Update all direct `src/lib/...` references to `src/...`.

- [ ] **Step 3: Verify old paths are gone from active code/tests**

Run: `rg "src/lib/" src tests package.json README.md`
Expected: no active source/test/package metadata references remain

- [ ] **Step 4: Run full verification**

Run:
- `bun test`
- `bun run typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tests
git commit -m "test: update source path references after flattening"
```

### Task 3: Update Active Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-03-27-src-flattening-design.md`
- Modify: active docs that still reference `src/lib/` and are intended to stay current

- [ ] **Step 1: Update active docs**

Only rewrite references that are still part of the living documentation set.
Do not churn archival notes unnecessarily.

- [ ] **Step 2: Verify active docs no longer point to old source paths**

Run: `rg "src/lib/" README.md docs/superpowers`
Expected: only intentionally historical references remain, or none if all active docs are updated

- [ ] **Step 3: Commit**

```bash
git add README.md docs/superpowers
git commit -m "docs: align source paths after src flattening"
```

### Task 4: Final Verification And Diff Review

**Files:**
- Modify: repository-wide path references from the tasks above

- [ ] **Step 1: Run final verification**

Run:
- `bun test`
- `bun run typecheck`

Expected: PASS

- [ ] **Step 2: Review final diff**

Run:
- `git diff --stat main...HEAD`
- `git status --short`

Confirm the change is still path-only and does not introduce unrelated behavior changes.

- [ ] **Step 3: Commit any final cleanups**

```bash
git add -A
git commit -m "chore: complete src flattening cleanup"
```
