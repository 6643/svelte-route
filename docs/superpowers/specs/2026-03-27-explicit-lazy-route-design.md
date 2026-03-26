# Explicit Lazy Route Design

## Goal

Remove the current runtime ambiguity between sync Svelte components and zero-argument lazy loader functions in `Route.component`, so the router no longer executes user functions to guess whether a route is lazy.

## Background

Today `Route.svelte` accepts both:

- sync Svelte components
- zero-argument functions that return `import(...)`

Because both values arrive through the same `component` prop, the runtime currently probes zero-argument functions by executing them and checking whether the result is promise-like.

That creates a structural problem:

- invalid zero-argument functions can cause side effects before being rejected
- lazy detection depends on runtime heuristics instead of an explicit contract
- the heuristic leans on current Svelte runtime shape instead of a route-level API contract

## Decision

Adopt one explicit lazy route form and remove the implicit one.

### Supported forms

Sync route:

```svelte
<script lang="ts">
  import { Route } from 'svelte-route';
  import Home from './routes/Home.svelte';
</script>

<Route path="/" component={Home} />
```

Lazy route:

```svelte
<script lang="ts">
  import { Route, lazyRoute } from 'svelte-route';

  const loadSettings = () => import('./routes/Settings.svelte');
</script>

<Route path="/settings" component={lazyRoute(loadSettings)} />
```

### Unsupported form

The old implicit lazy form becomes invalid:

```svelte
<Route path="/settings" component={loadSettings} />
```

It must fail with a clear runtime error that points users to `lazyRoute(...)`.

## Non-Goals

- Do not add a second route prop such as `load`
- Do not keep compatibility shims for bare zero-argument loaders
- Do not move lazy semantics into `svelte-builder`
- Do not change sync route behavior

## API Shape

Add a new public helper:

```ts
lazyRoute(loader: LazyRouteLoader): LazyRouteDefinition
```

Recommended internal shape:

```ts
type LazyRouteDefinition = {
  kind: 'lazy-route';
  load: () => Promise<{ default: SyncRouteComponent }>;
};
```

This should live in `src/lib/lazy.ts` and be re-exported from `src/lib/index.ts`.

## Type Model

Update router types so `Route.component` no longer means "sync component or arbitrary zero-argument function".

Proposed model:

```ts
type SyncRouteComponent = Component<any>;
type LazyRouteLoader = () => Promise<{ default: SyncRouteComponent }>;
type LazyRouteDefinition = {
  kind: 'lazy-route';
  load: LazyRouteLoader;
};
type RouteComponent = SyncRouteComponent | LazyRouteDefinition;
```

## Runtime Behavior

`Route.svelte` should branch explicitly:

1. If `component` is a sync Svelte component, render it directly.
2. If `component` is a `LazyRouteDefinition`, call `load()` only when the route is active.
3. If `component` is a bare zero-argument function, reject it with an error that instructs the caller to wrap it in `lazyRoute(...)`.

The lazy path keeps the current guarantees:

- no default loading DOM
- loader errors bubble
- resolved module must expose a function-valued `default` export
- query-only navigation must not restart an already pending or resolved lazy load

## Runtime Flow

```mermaid
flowchart TD
    A[Route receives component prop] --> B{Sync component or lazy definition?}
    B -->|Sync component| C[Render directly when active]
    B -->|Lazy definition| D[When active call load()]
    B -->|Bare zero-arg function| E[Throw explicit lazyRoute wrapper error]
    D --> F{Promise resolves?}
    F -->|No| G[Bubble loader error]
    F -->|Yes| H{default export is valid component?}
    H -->|No| I[Throw invalid lazy module error]
    H -->|Yes| J[Render resolved component]
```

## Validation Rules

Validation responsibilities should be split clearly:

- `lazyRoute(...)`
  - checks the input is a function
  - returns a branded lazy definition object

- `Route.svelte`
  - accepts sync components and lazy definitions
  - rejects bare zero-argument functions with a targeted error

- `route-validation.ts`
  - recognizes `LazyRouteDefinition`
  - validates resolved lazy modules

## Migration Strategy

This is intentionally a breaking change.

Required migration:

Before:

```ts
const loadSettings = () => import('./routes/Settings.svelte');
```

```svelte
<Route path="/settings" component={loadSettings} />
```

After:

```ts
const loadSettings = () => import('./routes/Settings.svelte');
```

```svelte
<Route path="/settings" component={lazyRoute(loadSettings)} />
```

README and public API docs must present only the explicit form.

## Files

Expected implementation touch points:

- Create: `src/lib/lazy.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/route-validation.ts`
- Modify: `src/lib/Route.svelte`
- Modify: `src/lib/index.ts`
- Modify: `tests/route-component.test.ts`
- Modify: `tests/query-navigation-history.test.ts`
- Modify: `README.md`

## Testing Strategy

Required tests:

1. Public API
- `lazyRoute` is exported from the public entry

2. Route contract
- sync components still render
- `lazyRoute(() => import(...))` renders correctly
- bare zero-argument loaders are rejected with an explicit wrapper error

3. Lazy runtime
- invalid non-promise lazy input still fails clearly
- resolved module without valid `default` export still fails clearly
- query-only navigation does not restart pending lazy load
- query-only navigation keeps resolved lazy route mounted

4. Regression boundary
- no route path or history behavior regresses while introducing the explicit lazy definition

## Risks

### Breaking change risk

Existing lazy routes using the implicit form will fail until migrated.

Mitigation:

- make the error message actionable
- update README examples everywhere
- keep the migration to one wrapper call per lazy route

### Type drift risk

`RouteComponent` becomes stricter, so test fixtures and docs must move in lockstep.

Mitigation:

- update public entry tests
- update route component tests before implementation

## Conclusion

The explicit `lazyRoute(...)` approach is the smallest change that truly removes the side-effectful detection problem.

### Facts

- current lazy detection depends on executing zero-argument functions
- current API does not provide an explicit lazy route marker
- the router package, not `svelte-builder`, owns this runtime contract

### Assumptions

- a breaking lazy-route migration is acceptable
- maintaining one route prop is preferable to introducing a separate `load` prop

### Recommendation

Implement `lazyRoute(...)` as the single supported lazy route form and remove implicit zero-argument lazy detection from `Route.svelte`.
