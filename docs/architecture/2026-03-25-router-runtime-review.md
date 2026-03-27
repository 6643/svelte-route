# Router Singleton Runtime Review

## Goal

Assess whether the current `svelte-route` runtime design is safe and maintainable for continued internal use, and identify the point at which the singleton model becomes a problem.

## Scope

Reviewed files:
- `src/router.svelte.ts`
- `src/history.ts`
- `src/Route.svelte`

This review focuses on runtime state ownership, browser integration, route registration, matching semantics, and future multi-instance constraints.

## Current Design Summary

The router runtime is implemented as a module-level singleton in `src/router.svelte.ts`.
All mounted `<Route>` components register themselves into one shared in-memory route table. Navigation helpers and browser `popstate` handling also operate against this same singleton state.

Core singleton state:
- `initialized`
- `currentPath`
- `historyState`
- `entries`
- `listeners`
- `matchedRouteId`
- `matchDirty`
- `runtimeWindow`

`Route.svelte` is a thin consumer of this runtime:
- validates route props
- registers a route entry on mount
- subscribes to runtime invalidation
- computes `active` by comparing its entry id to the singleton matched route id
- decodes query props only for the active route
- renders sync or lazy components

## Strengths

### 1. Small and predictable runtime surface
The singleton design keeps the runtime compact. Route matching, navigation, and history repair all live in a narrow control surface, which lowers local complexity.

### 2. Explicit browser-only boundary
`ensureBrowser()` fails fast outside a browser environment. That is a good defensive boundary for a client-only SPA router.

### 3. Controlled history state ownership
The runtime only trusts and repairs its own `__route` state. Foreign `history.state` fields are preserved for compatibility but are not used for routing decisions.

### 4. Deterministic route resolution
Matching is simple:
- exact path match wins
- last matching exact route wins
- otherwise last `*` route wins

This is easy to reason about and well covered by tests.

## Risks and Limitations

### 1. Global mutable state prevents multiple independent router instances
All routes mounted in the page share one `entries` list and one `currentPath`.
That means the design assumes a single application routing context.

Consequences:
- two independent app shells on the same page will compete for route ownership
- microfrontend-style composition will leak route registrations across boundaries
- tests and story-style harnesses must reset the singleton to avoid cross-test contamination

### 2. Lifecycle coupling is implicit
`Route.svelte` registration and subscription are tied to mount order and teardown order, but the runtime API does not model router ownership explicitly.
This is acceptable for a tiny library, but it means the runtime cannot express scoped route groups, nested routers, or isolated navigation domains.

### 3. Browser event binding is singleton-scoped
Only one `popstate` listener is attached, and it is bound to the current global `window`.
This is fine for the intended browser SPA case, but it confirms the design is not intended for concurrent isolated environments.

### 4. Matching cache is process-global
`matchedRouteId` and `matchDirty` cache the last route lookup across the entire runtime.
This improves repeated reads, but only works because there is one global routing state.
The optimization would need redesign if instance scoping is introduced.

### 5. Navigation API and rendering API are tightly coupled
`routePush()` / `routeReplace()` mutate the same singleton state that `<Route>` consumes.
This is convenient, but it means there is no clean seam today for injecting an alternative runtime or for hosting multiple runtimes side by side.

## Safe Usage Envelope

The current design is safe and appropriate when all of the following are true:
- the page hosts one SPA routing context
- routing is pathname-based with a single global location source
- route definitions mount within one app lifecycle
- applications can tolerate runtime-thrown configuration and decoder errors
- tests reset the singleton between isolated runs

For the current repository scope, this envelope matches the implementation goals.

## What Would Break First If the Library Expands

If the library later adds any of the following, the singleton design becomes the first architectural pressure point:
- nested routers
- multi-app embedding on the same page
- scoped route trees
- SSR/hydration-aware routing contexts
- alternate history sources or in-memory routers

At that point, the global `entries`, `listeners`, and `currentPath` model would create hidden coupling and make behavior harder to predict.

## Recommended Evolution Path

### Recommendation for now: do not refactor immediately
A runtime instance abstraction is not justified yet.
The current library is intentionally small, and the singleton keeps the implementation simple.
A premature refactor would add abstraction cost without unlocking immediate product value.

### Recommended next step if requirements grow
If the project later needs multiple routing scopes, extract a `createRouteRuntime()` factory that owns:
- route entries
- subscribers
- history snapshot
- match cache
- browser binding lifecycle

Then keep the current singleton export as the default runtime built from that factory.
This would preserve the public API while creating an internal seam for future multi-instance support.

## Decision

### Current decision
Keep the singleton runtime.

### Why
- current feature set fits the model
- tests demonstrate deterministic behavior
- the major risks are expansion risks, not current correctness risks
- introducing instance scoping now would be more complexity than benefit

### Conditions that should trigger re-review
Revisit the design if any of these become active requirements:
- nested routing
- per-widget isolated routing
- embedding multiple apps in one document
- server rendering support
- configurable history backends

## Bottom Line

The singleton runtime is a reasonable current-state architecture, not a latent security bug.
Its main weakness is not correctness under today's scope, but limited extensibility once routing needs become multi-scope or multi-host.
