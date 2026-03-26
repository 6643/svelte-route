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

const invalidateRouteMatch = (): void => {
  matchDirty = true;
};

const readCurrentUrl = (): string => `${window.location.pathname}${window.location.search}${window.location.hash}` || '/';

const notify = (): void => {
  for (const listener of listeners) {
    listener();
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

const syncRuntimeFromBrowser = (nextHistoryState: unknown): boolean => {
  const nextPath = readCurrentPath();
  const normalizedState = normalizeHistoryState(nextHistoryState, nextPath, historyOwner);
  const pathChanged = nextPath !== currentPath;

  currentPath = nextPath;
  historyState = normalizedState;

  if (pathChanged) {
    invalidateRouteMatch();
  }

  return nextHistoryState !== normalizedState;
};

const handlePopState = (event: PopStateEvent): void => {
  ensureBrowser();

  const repaired = syncRuntimeFromBrowser(event.state);
  if (repaired) {
    history.replaceState(historyState, '', readCurrentUrl());
  }

  notify();
};

const bindRuntimeWindow = (): void => {
  if (runtimeWindow === window) {
    return;
  }

  runtimeWindow?.removeEventListener('popstate', handlePopState);
  window.addEventListener('popstate', handlePopState);
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

  if (kind === 'push') {
    history.pushState(nextState, '', nextUrl);
  } else {
    history.replaceState(nextState, '', nextUrl);
  }

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
