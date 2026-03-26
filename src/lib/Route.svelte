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
  import { isPromiseLike, resolveLazyRouteComponent } from './route-validation.ts';
  import type { RouteComponent, RouteDecoder, RouteDecoderMap, RouteEntry } from './types.ts';

  type RouteProps = {
    path: string;
    component: RouteComponent;
  } & Record<string, unknown>;

  let props = $props();

  const isDecoder = ((value) => value === String || value === Number || value === Boolean || typeof value === 'function') as (
    value: unknown,
  ) => value is RouteDecoder;

  const validateRouteProps = (): { path: string; component: RouteComponent; decoders: RouteDecoderMap } => {
    const routeProps = props as RouteProps;

    if (typeof routeProps.path !== 'string') {
      throw new Error('Route path must be a string');
    }

    if (
      routeProps.path !== '*' &&
      (!routeProps.path.startsWith('/') ||
        routeProps.path.startsWith('//') ||
        routeProps.path.includes('?') ||
        routeProps.path.includes('#'))
    ) {
      throw new Error('Route path must be "*" or an absolute pathname without query or hash');
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
  let resolvedComponent = $state<RouteComponent | null>(null);
  let lazyLoader = $state<(() => Promise<{ default: RouteComponent }>) | null>(null);
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

  let lazyProbeSettled = false;

  $effect(() => {
    loadError = null;

    if (!active) {
      if (!lazyLoader) {
        resolvedComponent = null;
      }

      return;
    }

    if (resolvedComponent || lazyLoader || lazyProbeSettled) {
      return;
    }

    const candidate = initialComponent as (...args: unknown[]) => unknown;

    if (candidate.length !== 0) {
      resolvedComponent = initialComponent;
      return;
    }

    const probe = candidate();

    if (!isPromiseLike(probe)) {
      loadError = new Error('Lazy route component must be a zero-argument function that returns a promise');
      return;
    }

    lazyLoader = () => probe as Promise<{ default: RouteComponent }>;
    lazyProbeSettled = true;
  });

  $effect(() => {
    if (!active || resolvedComponent || !lazyLoader) {
      return;
    }

    let cancelled = false;

    lazyLoader()
      .then((module) => {
        if (!cancelled) {
          resolvedComponent = resolveLazyRouteComponent(module);
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
