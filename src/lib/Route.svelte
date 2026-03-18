<svelte:options runes={true} />

<script lang="ts">
  import { untrack } from 'svelte';

  import {
    initRouteSystem,
    routerState,
    registerRoute
  } from './router.svelte.ts';
  import { decodeRouteProps } from './query.ts';
  import type {
    LazyRouteComponent,
    RouteComponent,
    RouteDecoder,
    RouteDecoderMap,
    RouteEntry,
    SyncRouteComponent
  } from './types.ts';

  type RouteProps = {
    path: string;
    component: RouteComponent;
  } & Record<string, unknown>;

  let { path, component, ...rest }: RouteProps = $props();

  function isDecoder(value: unknown): value is RouteDecoder {
    return value === String || value === Number || value === Boolean || typeof value === 'function';
  }

  function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
    return !!value && (typeof value === 'object' || typeof value === 'function') && typeof (value as PromiseLike<unknown>).then === 'function';
  }

  function isLazyLoader(value: RouteComponent): value is LazyRouteComponent {
    return typeof value === 'function' && value.length === 0;
  }

  function validateRouteProps(input: RouteProps): { path: string; component: RouteComponent; decoders: RouteDecoderMap } {
    if (typeof input.path !== 'string') {
      throw new Error('Route path must be a string');
    }

    if (!('component' in input) || input.component == null) {
      throw new Error('Route component is required');
    }

    if (isPromiseLike(input.component)) {
      throw new Error('Invalid Route component');
    }

    if (typeof input.component === 'object') {
      throw new Error('Invalid Route component');
    }

    if (typeof input.component !== 'function') {
      throw new Error('Invalid Route component');
    }

    const decoders = {} as RouteDecoderMap;

    for (const key in input) {
      if (key === 'path' || key === 'component') {
        continue;
      }

      if (!key.startsWith('$')) {
        throw new Error(`Unsupported Route prop: ${key}`);
      }

      const decoder = input[key];
      if (!isDecoder(decoder)) {
        throw new Error(`Invalid decoder for Route prop: ${key}`);
      }

      decoders[key as keyof RouteDecoderMap] = decoder;
    }

    return {
      path: input.path,
      component: input.component,
      decoders
    };
  }

  const config = untrack(() => {
    initRouteSystem();
    return validateRouteProps({ path, component, ...rest });
  });
  const initialComponent = config.component;
  const entry: RouteEntry = {
    id: Symbol(config.path),
    path: config.path,
    component: config.component,
    decoders: config.decoders
  };

  let resolvedComponent = $state<SyncRouteComponent | null>(
    isLazyLoader(initialComponent) ? null : initialComponent
  );
  let loadError = $state<unknown | null>(null);

  $effect(() => {
    if (component !== initialComponent) {
      throw new Error('Route component cannot change after mount');
    }
  });

  $effect(() => {
    const unregister = untrack(() => registerRoute(entry));

    return () => {
      untrack(unregister);
    };
  });

  const active = $derived.by(() => {
    const pathname = routerState.currentPath.split('?')[0] || '/';
    const matchedId =
      routerState.entries.find((candidate: RouteEntry) => candidate.path === pathname)?.id ??
      routerState.entries.find((candidate: RouteEntry) => candidate.path === '*')?.id ??
      null;

    return matchedId === entry.id;
  });

  const decodedProps = $derived.by(() => {
    if (!active) {
      return {};
    }

    const search = routerState.currentPath.includes('?') ? `?${routerState.currentPath.split('?').slice(1).join('?')}` : '';
    return decodeRouteProps(search, entry.decoders);
  });

  $effect(() => {
    loadError = null;

    if (!active) {
      resolvedComponent = isLazyLoader(initialComponent) ? null : initialComponent;
      return;
    }

    if (!isLazyLoader(initialComponent)) {
      resolvedComponent = initialComponent;
      return;
    }

    const loader = initialComponent as LazyRouteComponent;
    resolvedComponent = null;
    let cancelled = false;

    loader()
      .then((module: { default: SyncRouteComponent }) => {
        if (!cancelled) {
          resolvedComponent = module.default;
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          loadError = error;
        }
      });

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    if (loadError) {
      throw loadError;
    }
  });
</script>

{#if active && resolvedComponent}
  {@const Active = resolvedComponent}
  <Active {...decodedProps} />
{/if}
