import type { RouteHistoryState } from './types.ts';

const buildInitialRouteState = (currentPath: string): RouteHistoryState['__route'] => ({
  index: 0,
  stack: [currentPath]
});

const isManagedStackEntry = (value: unknown): value is string => typeof value === 'string' && value.startsWith('/');

const isValidManagedRouteState = (route: unknown, currentPath: string): route is RouteHistoryState['__route'] => {
  if (!route || typeof route !== 'object') {
    return false;
  }

  const index = (route as { index?: unknown }).index;
  const stack = (route as { stack?: unknown }).stack;

  if (!Number.isInteger(index) || !Array.isArray(stack) || stack.length === 0) {
    return false;
  }

  const routeIndex = index as number;
  const routeStack = stack as unknown[];

  if (routeIndex < 0 || routeIndex >= routeStack.length) {
    return false;
  }

  if (!routeStack.every(isManagedStackEntry)) {
    return false;
  }

  return routeStack[routeIndex] === currentPath;
};

export const normalizeHistoryState = (state: unknown, currentPath: string): RouteHistoryState => {
  if (state && typeof state === 'object') {
    const output = state as Record<string, unknown>;
    const route = output.__route;

    if (isValidManagedRouteState(route, currentPath)) {
      return state as RouteHistoryState;
    }

    return {
      ...output,
      __route: buildInitialRouteState(currentPath)
    };
  }

  return {
    __route: buildInitialRouteState(currentPath)
  };
};

export const buildPushState = (prev: RouteHistoryState, nextPath: string): RouteHistoryState => {
  const nextIndex = prev.__route.index + 1;

  return {
    ...prev,
    __route: {
      index: nextIndex,
      stack: [...prev.__route.stack.slice(0, nextIndex), nextPath]
    }
  };
};

export const buildReplaceState = (prev: RouteHistoryState, nextPath: string): RouteHistoryState => {
  const nextStack = prev.__route.stack.slice();
  nextStack[prev.__route.index] = nextPath;

  return {
    ...prev,
    __route: {
      index: prev.__route.index,
      stack: nextStack
    }
  };
};
