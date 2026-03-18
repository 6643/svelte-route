# svelte-route

A lightweight SPA router for Svelte 5 projects.

## Features

- Bun-only workflow
- Svelte 5 only
- Declarative `<Route>` API
- Programmatic navigation helpers
- Query decoder props with `$name` syntax
- Wildcard fallback routes
- Lazy-loaded route components

## Install

```bash
bun add svelte-route
```

## Basic Usage

```svelte
<script lang="ts">
  import { Route } from 'svelte-route';

  import Home from './routes/Home.svelte';
  import User from './routes/User.svelte';
  import NotFound from './routes/NotFound.svelte';
</script>

<Route path="/" component={Home} />
<Route path="/user" component={User} $id={Number} />
<Route path="*" component={NotFound} />
```

## Programmatic Navigation

```ts
import {
  routeBackPath,
  routeCurrentPath,
  routeForwardPath,
  routePush,
  routeReplace
} from 'svelte-route';

routePush('/user?id=1');
routeReplace('/login');

const current = routeCurrentPath();
const back = routeBackPath();
const forward = routeForwardPath();
```

## Query Decoder Props

Use `$name` props to decode query string values before they reach the route component.

```svelte
<script lang="ts">
  import { Route } from 'svelte-route';

  import Search from './routes/Search.svelte';

  const parseTags = (raw: string | null) => raw?.split(',').filter(Boolean);
</script>

<Route
  path="/search"
  component={Search}
  $page={Number}
  $enabled={Boolean}
  $tags={parseTags}
/>
```

For `/search?page=2&enabled=true&tags=red,blue`, `Search` receives:

```ts
{
  page: 2,
  enabled: true,
  tags: ['red', 'blue']
}
```

## Lazy Routes

`component` also accepts a lazy loader with the shape `() => import('./Component.svelte')`.

```svelte
<script lang="ts">
  import { Route } from 'svelte-route';

  const loadSettings = () => import('./routes/Settings.svelte');
</script>

<Route path="/settings" component={loadSettings} />
```

Behavior:

- No default loading UI is rendered while the loader is pending
- The resolved module's `default` export is rendered
- Loader errors are thrown upward

## Supported Navigation Inputs

```ts
routePush('/user?id=1');
routePush('?page=2');
routeReplace('https://your-app.test/user?id=1');
```

Invalid inputs throw:

- `foo`
- `./foo`
- `../foo`
- cross-origin URLs

## Notes

- This package is for client-side SPA routing only
- Dynamic route params are not included
- Nested routes are not included
- `component` is treated as immutable route configuration after mount

## Development

```bash
bun install
bun test
bun run typecheck
```
