import type { RouteHistoryState } from './types.ts';

export function normalizeHistoryState(state: unknown, currentPath: string): RouteHistoryState {
  const base = state && typeof state === 'object' ? { ...(state as Record<string, unknown>) } : {};
  const route = base.__route;

  if (
    route &&
    typeof route === 'object' &&
    typeof (route as { index?: unknown }).index === 'number' &&
    Array.isArray((route as { stack?: unknown }).stack)
  ) {
    return base as RouteHistoryState;
  }

  return {
    ...base,
    __route: {
      index: 0,
      stack: [currentPath]
    }
  };
}

export function buildPushState(prev: RouteHistoryState, nextPath: string): RouteHistoryState {
  const nextIndex = prev.__route.index + 1;

  return {
    ...prev,
    __route: {
      index: nextIndex,
      stack: [...prev.__route.stack.slice(0, nextIndex), nextPath]
    }
  };
}

export function buildReplaceState(prev: RouteHistoryState, nextPath: string): RouteHistoryState {
  const nextStack = prev.__route.stack.slice();
  nextStack[prev.__route.index] = nextPath;

  return {
    ...prev,
    __route: {
      index: prev.__route.index,
      stack: nextStack
    }
  };
}
