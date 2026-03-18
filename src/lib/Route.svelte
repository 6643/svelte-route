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

  let props: RouteProps = $props();

  const isDecoder = (value: unknown): value is RouteDecoder => value === String || value === Number || value === Boolean || typeof value === 'function';

  const isLazyLoader = (value: RouteComponent): boolean => value.length === 0;

  const validateRouteProps = (): { path: string; component: RouteComponent; decoders: RouteDecoderMap } => {
    if (typeof props.path !== 'string') {
      throw new Error('Route path must be a string');
    }

    if (typeof props.component !== 'function') {
      throw new Error('Invalid Route component');
    }

    const decoders = {} as RouteDecoderMap;

    for (const key in props) {
      if (key === 'path' || key === 'component') {
        continue;
      }

      if (!key.startsWith('$')) {
        throw new Error(`Unsupported Route prop: ${key}`);
      }

      const decoder = props[key];
      if (!isDecoder(decoder)) {
        throw new Error(`Invalid decoder for Route prop: ${key}`);
      }

      decoders[key as keyof RouteDecoderMap] = decoder;
    }

    return { path: props.path, component: props.component, decoders };
  };

  initRouteSystem();

  const config = validateRouteProps();
  const initialComponent = config.component;
  const entry: RouteEntry = {
    id: Symbol(config.path),
    path: config.path,
    component: config.component,
    decoders: config.decoders
  };
  const unregister = registerRoute(entry);
  let runtimeVersion = $state(0);
  let resolvedComponent = $state<RouteComponent | null>(isLazyLoader(initialComponent) ? null : initialComponent);
  let loadError = $state<unknown | null>(null);

  $effect(() => {
    if (props.component !== initialComponent) {
      throw new Error('Route component cannot change after mount');
    }
  });

  $effect(() => {
    const unsubscribe = subscribeRuntime(() => {
      runtimeVersion += 1;
    });

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
    runtimeVersion;
    loadError = null;

    if (!active) {
      resolvedComponent = isLazyLoader(initialComponent) ? null : initialComponent;
      return;
    }

    if (!isLazyLoader(initialComponent)) {
      resolvedComponent = initialComponent;
      return;
    }

    resolvedComponent = null;
    let cancelled = false;

    const loader = initialComponent as () => Promise<{ default: RouteComponent }>;

    loader()
      .then((module: { default: RouteComponent }) => {
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
