import type { LazyRouteDefinition, LazyRouteLoader } from './types.ts';

export const lazyRoute = (loader: LazyRouteLoader): LazyRouteDefinition => {
  if (typeof loader !== 'function') {
    throw new Error('lazyRoute loader must be a function');
  }

  return {
    kind: 'lazy-route',
    load: loader
  };
};
