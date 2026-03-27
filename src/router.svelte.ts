import { buildPushState, buildReplaceState, createManagedHistoryOwner, createManagedRouteState, normalizeHistoryState } from './history.ts';
import { normalizeNavigationTarget } from './navigation.ts';
import type { RouteDecoderMap, RouteEntry, RouteHistoryState } from './types.ts';

let initialized = false;
let currentPath = '/';
let historyOwner = createManagedHistoryOwner();
let historyState: RouteHistoryState = {
  __route: createManagedRouteState(
    {
      index: 0,
      stack: ['/']
    },
    historyOwner
  )
};
let entries: RouteEntry[] = [];
const listeners = new Set<() => void>();
let matchedRouteId: symbol | null = null;
let matchDirty = true;
let runtimeWindow: Window | null = null;
let runtimeHistory: History | null = null;
let originalPushState: History['pushState'] | null = null;
let originalReplaceState: History['replaceState'] | null = null;
let suppressPatchedHistorySync = false;

const invalidateRouteMatch = (): void => {
  matchDirty = true;
};

const readCurrentUrl = (): string => `${window.location.pathname}${window.location.search}${window.location.hash}` || '/';

const isPlainHistoryStateObject = (state: unknown): state is Record<string, unknown> => {
  if (!state || typeof state !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(state);
  return prototype === Object.prototype || prototype === null;
};

const hasManagedRouteState = (state: unknown): state is { __route: unknown } =>
  !!state && typeof state === 'object' && '__route' in (state as Record<string, unknown>);

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const withPatchedHistorySyncSuppressed = (run: () => void): void => {
  const previous = suppressPatchedHistorySync;
  suppressPatchedHistorySync = true;

  try {
    run();
  } finally {
    suppressPatchedHistorySync = previous;
  }
};

const ensureBrowser = (): void => {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof history === 'undefined' ||
    typeof location === 'undefined'
  ) {
    throw new Error('svelte-route requires a browser environment');
  }
};

const readCurrentPath = (): string => `${window.location.pathname}${window.location.search}` || '/';

const getCurrentPathname = (): string => currentPath.split('?')[0] || '/';

const findMatchedRouteId = (routeEntries: RouteEntry[]): symbol | null => {
  const pathname = getCurrentPathname();
  let fallbackId: symbol | null = null;

  for (let index = routeEntries.length - 1; index >= 0; index -= 1) {
    const entry = routeEntries[index];
    const entryPath = entry.path;

    if (entryPath === pathname) {
      return entry.id;
    }

    if (fallbackId == null && entryPath === '*') {
      fallbackId = entry.id;
    }
  }

  return fallbackId;
};

const createRuntimeHistoryState = (browserState: unknown, route: RouteHistoryState['__route']): RouteHistoryState => {
  if (isPlainHistoryStateObject(browserState)) {
    return {
      ...browserState,
      __route: route
    };
  }

  return {
    __route: route
  };
};

const findNearestKnownRouteIndex = (nextPath: string): number | null => {
  let nearestIndex: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < historyState.__route.stack.length; index += 1) {
    if (historyState.__route.stack[index] !== nextPath) {
      continue;
    }

    const distance = Math.abs(index - historyState.__route.index);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
};

const reconcileManagedRouteState = (nextPath: string): RouteHistoryState['__route'] => {
  if (nextPath === currentPath) {
    return historyState.__route;
  }

  const nearestIndex = findNearestKnownRouteIndex(nextPath);
  if (nearestIndex != null) {
    return createManagedRouteState(
      {
        index: nearestIndex,
        stack: historyState.__route.stack
      },
      historyOwner
    );
  }

  return createManagedRouteState(
    {
      index: 0,
      stack: [nextPath]
    },
    historyOwner
  );
};

const syncRuntimeFromBrowser = (nextHistoryState: unknown): boolean => {
  const nextPath = readCurrentPath();
  const pathChanged = nextPath !== currentPath;

  if (!hasManagedRouteState(nextHistoryState)) {
    historyState = createRuntimeHistoryState(nextHistoryState, reconcileManagedRouteState(nextPath));
    currentPath = nextPath;

    if (pathChanged) {
      invalidateRouteMatch();
    }

    return false;
  }

  const normalizedState = normalizeHistoryState(nextHistoryState, nextPath, historyOwner);
  currentPath = nextPath;
  historyState = normalizedState;

  if (pathChanged) {
    invalidateRouteMatch();
  }

  return nextHistoryState !== normalizedState;
};

const commitHistoryState = (kind: 'push' | 'replace', state: RouteHistoryState, url: string): void => {
  withPatchedHistorySyncSuppressed(() => {
    if (kind === 'push') {
      (originalPushState ?? history.pushState).call(history, state, '', url);
      return;
    }

    (originalReplaceState ?? history.replaceState).call(history, state, '', url);
  });
};

const syncRuntimeFromExternalHistoryMutation = (kind: 'push' | 'replace'): void => {
  const nextPath = readCurrentPath();
  const pathChanged = nextPath !== currentPath;

  if (!pathChanged) {
    historyState = createRuntimeHistoryState(history.state, historyState.__route);
    return;
  }

  const nextRouteState = kind === 'push' ? buildPushState(historyState, nextPath, historyOwner) : buildReplaceState(historyState, nextPath, historyOwner);
  const nextState = createRuntimeHistoryState(history.state, nextRouteState.__route);

  currentPath = nextPath;
  historyState = nextState;

  invalidateRouteMatch();
  notify();
};

const handlePopState = (event: PopStateEvent): void => {
  ensureBrowser();

  const repaired = syncRuntimeFromBrowser(event.state);
  if (repaired) {
    commitHistoryState('replace', historyState, readCurrentUrl());
  }

  notify();
};

const restorePatchedHistory = (): void => {
  if (runtimeHistory) {
    if (originalPushState) {
      runtimeHistory.pushState = originalPushState;
    }

    if (originalReplaceState) {
      runtimeHistory.replaceState = originalReplaceState;
    }
  }

  runtimeHistory = null;
  originalPushState = null;
  originalReplaceState = null;
  suppressPatchedHistorySync = false;
};

const patchRuntimeHistory = (): void => {
  if (runtimeHistory === history) {
    return;
  }

  restorePatchedHistory();
  runtimeHistory = history;
  originalPushState = history.pushState;
  originalReplaceState = history.replaceState;

  history.pushState = ((data: unknown, unused: string, url?: string | URL | null): void => {
    originalPushState?.call(history, data, unused, url);

    if (!suppressPatchedHistorySync) {
      syncRuntimeFromExternalHistoryMutation('push');
    }
  }) as History['pushState'];

  history.replaceState = ((data: unknown, unused: string, url?: string | URL | null): void => {
    originalReplaceState?.call(history, data, unused, url);

    if (!suppressPatchedHistorySync) {
      syncRuntimeFromExternalHistoryMutation('replace');
    }
  }) as History['replaceState'];
};

const bindRuntimeWindow = (): void => {
  if (runtimeWindow === window && runtimeHistory === history) {
    return;
  }

  runtimeWindow?.removeEventListener('popstate', handlePopState);
  restorePatchedHistory();
  window.addEventListener('popstate', handlePopState);
  patchRuntimeHistory();
  runtimeWindow = window;
};

const ensureRuntime = (): void => {
  ensureBrowser();

  if (initialized) {
    return;
  }

  const repaired = syncRuntimeFromBrowser(history.state);
  if (repaired) {
    history.replaceState(historyState, '', readCurrentUrl());
  }

  bindRuntimeWindow();
  initialized = true;
};

export const initRouteSystem = (): void => {
  ensureRuntime();
};

const navigate = (kind: 'push' | 'replace', target: string): void => {
  ensureRuntime();

  const nextPath = normalizeNavigationTarget(target, currentPath, window.location.origin);
  const nextUrl = target === '?' || target.startsWith('?') ? `${nextPath}${window.location.hash}` : nextPath;
  if (nextPath === currentPath) {
    return;
  }

  const nextState =
    kind === 'push' ? buildPushState(historyState, nextPath, historyOwner) : buildReplaceState(historyState, nextPath, historyOwner);

  commitHistoryState(kind, nextState, nextUrl);

  currentPath = nextPath;
  historyState = nextState;
  invalidateRouteMatch();
  notify();
};

export const subscribeRuntime = (update: () => void): (() => void) => {
  listeners.add(update);

  return () => {
    listeners.delete(update);
  };
};

export const registerRoute = (entry: RouteEntry): (() => void) => {
  ensureRuntime();
  const previousMatch = getMatchedRouteId();
  entries = [...entries, entry];
  invalidateRouteMatch();
  const nextMatch = getMatchedRouteId();

  if (nextMatch !== previousMatch) {
    notify();
  }

  return () => {
    const previousMatch = getMatchedRouteId();
    entries = entries.filter((candidate) => candidate.id !== entry.id);
    invalidateRouteMatch();
    const nextMatch = getMatchedRouteId();

    if (nextMatch !== previousMatch) {
      notify();
    }
  };
};

export const getMatchedRouteId = (): symbol | null => {
  if (!matchDirty) {
    return matchedRouteId;
  }

  matchedRouteId = findMatchedRouteId(entries);
  matchDirty = false;
  return matchedRouteId;
};

export const getCurrentSearch = (): string => currentPath.includes('?') ? `?${currentPath.split('?').slice(1).join('?')}` : '';

export const routePush = (path: string): void => {
  navigate('push', path);
};

export const routeReplace = (path: string): void => {
  navigate('replace', path);
};

export const routeCurrentPath = (): string => {
  ensureRuntime();
  return currentPath;
};

export const routeBackPath = (): string | null => {
  ensureRuntime();
  return historyState.__route.stack[historyState.__route.index - 1] ?? null;
};

export const routeForwardPath = (): string | null => {
  ensureRuntime();
  return historyState.__route.stack[historyState.__route.index + 1] ?? null;
};

export const __createRouteHistoryStateForTest = (route: {
  index: number;
  stack: string[];
}): RouteHistoryState['__route'] => createManagedRouteState(route, historyOwner);

export const __resetRouteSystemForTest = (): void => {
  runtimeWindow?.removeEventListener('popstate', handlePopState);
  restorePatchedHistory();
  runtimeWindow = null;
  initialized = false;
  currentPath = '/';
  historyOwner = createManagedHistoryOwner();
  entries = [];
  listeners.clear();
  matchedRouteId = null;
  matchDirty = true;
  historyState = {
    __route: createManagedRouteState(
      {
        index: 0,
        stack: ['/']
      },
      historyOwner
    )
  };
};
