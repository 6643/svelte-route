<svelte:options runes={true} />

<script lang="ts">
  import {
    getCurrentSearch,
    getMatchedRouteId,
    initRouteSystem,
    registerRoute,
    subscribeRuntime
  } from './router.svelte.ts';
  import { decodeRouteProps } from './query.ts';
  import type { RouteComponent, RouteDecoder, RouteDecoderMap, RouteEntry } from './types.ts';

  type RouteProps = {
    path: string;
    component: RouteComponent;
  } & Record<string, unknown>;

  let props = $props();

  const isDecoder = ((value) => value === String || value === Number || value === Boolean || typeof value === 'function') as (
    value: unknown,
  ) => value is RouteDecoder;

  const isLazyLoader = ((value) => value.length === 0) as (value: RouteComponent) => boolean;

  const validateRouteProps = (): { path: string; component: RouteComponent; decoders: RouteDecoderMap } => {
    const routeProps = props as RouteProps;

    if (typeof routeProps.path !== 'string') {
      throw new Error('Route path must be a string');
    }

    if (typeof routeProps.component !== 'function') {
      throw new Error('Invalid Route component');
    }

    const decoders = {} as RouteDecoderMap;

    for (const key in routeProps) {
      if (key === 'path' || key === 'component') {
        continue;
      }

      if (!key.startsWith('$')) {
        throw new Error(`Unsupported Route prop: ${key}`);
      }

      const decoder = routeProps[key];
      if (!isDecoder(decoder)) {
        throw new Error(`Invalid decoder for Route prop: ${key}`);
      }

      decoders[key as keyof RouteDecoderMap] = decoder;
    }

    return { path: routeProps.path, component: routeProps.component, decoders };
  };

  initRouteSystem();

  const config = validateRouteProps();
  const initialComponent = config.component;
  const entry = {
    id: Symbol(config.path),
    path: config.path,
    component: config.component,
    decoders: config.decoders
  } satisfies RouteEntry;
  let runtimeVersion = $state(0);
  const unsubscribe = subscribeRuntime(() => {
    runtimeVersion += 1;
  });
  const unregister = registerRoute(entry);
  let resolvedComponent = $state<RouteComponent | null>(isLazyLoader(initialComponent) ? null : initialComponent);
  let loadError = $state<unknown | null>(null);

  $effect(() => {
    const nextConfig = validateRouteProps();
    const nextDecoderKeys = Object.keys(nextConfig.decoders);
    const initialDecoderKeys = Object.keys(config.decoders);

    if (nextConfig.path !== config.path) {
      throw new Error('Route path cannot change after mount');
    }

    if (nextConfig.component !== initialComponent) {
      throw new Error('Route component cannot change after mount');
    }

    if (nextDecoderKeys.length !== initialDecoderKeys.length) {
      throw new Error('Route decoders cannot change after mount');
    }

    for (const key of nextDecoderKeys) {
      if (nextConfig.decoders[key as keyof RouteDecoderMap] !== config.decoders[key as keyof RouteDecoderMap]) {
        throw new Error('Route decoders cannot change after mount');
      }
    }
  });

  $effect(() => {
    return () => {
      unsubscribe();
    };
  });

  $effect(() => {
    return unregister;
  });

  const active = $derived.by(() => {
    runtimeVersion;
    return getMatchedRouteId() === entry.id;
  });

  const decodedProps = $derived.by(() => {
    runtimeVersion;
    return active ? decodeRouteProps(getCurrentSearch(), entry.decoders) : {};
  });

  $effect(() => {
    loadError = null;

    if (!active) {
      if (!isLazyLoader(initialComponent)) {
        resolvedComponent = initialComponent;
      }

      return;
    }

    if (!isLazyLoader(initialComponent)) {
      resolvedComponent = initialComponent;
      return;
    }

    if (resolvedComponent) {
      return;
    }

    let cancelled = false;

    const loader = initialComponent as () => Promise<{ default: RouteComponent }>;

    loader()
      .then((module) => {
        if (!cancelled) {
          resolvedComponent = module.default;
        }
      })
      .catch((error) => {
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
