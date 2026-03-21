import type { RouteHistoryState } from './types.ts';

export const normalizeHistoryState = (state: unknown, currentPath: string): RouteHistoryState => {
  if (state && typeof state === 'object') {
    const route = (state as Record<string, unknown>).__route;

    if (
      route &&
      typeof route === 'object' &&
      typeof (route as { index?: unknown }).index === 'number' &&
      Array.isArray((route as { stack?: unknown }).stack)
    ) {
      return state as RouteHistoryState;
    }

    return {
      ...(state as Record<string, unknown>),
      __route: {
        index: 0,
        stack: [currentPath]
      }
    };
  }

  return {
    __route: {
      index: 0,
      stack: [currentPath]
    }
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
