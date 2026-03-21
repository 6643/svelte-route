import { buildPushState, buildReplaceState, normalizeHistoryState } from './history.ts';
import { normalizeNavigationTarget } from './navigation.ts';
import type { RouteDecoderMap, RouteEntry, RouteHistoryState } from './types.ts';

let initialized = false;
let currentPath = '/';
let historyState: RouteHistoryState = {
  __route: {
    index: 0,
    stack: ['/']
  }
};
let entries: RouteEntry[] = [];
const listeners = new Set<() => void>();
let matchedRouteId: symbol | null = null;
let matchDirty = true;
let runtimeWindow: Window | null = null;

const invalidateMatchedRoute = (): void => {
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

const syncRuntimeFromBrowser = (nextHistoryState: unknown): boolean => {
  const nextPath = readCurrentPath();
  const normalizedState = normalizeHistoryState(nextHistoryState, nextPath);
  const pathChanged = nextPath !== currentPath;

  currentPath = nextPath;
  historyState = normalizedState;

  if (pathChanged) {
    invalidateMatchedRoute();
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
  if (nextPath === currentPath) {
    return;
  }

  const nextState = kind === 'push' ? buildPushState(historyState, nextPath) : buildReplaceState(historyState, nextPath);

  if (kind === 'push') {
    history.pushState(nextState, '', nextPath);
  } else {
    history.replaceState(nextState, '', nextPath);
  }

  currentPath = nextPath;
  historyState = nextState;
  invalidateMatchedRoute();
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
  entries = [...entries, entry];
  invalidateMatchedRoute();
  notify();

  return () => {
    entries = entries.filter((candidate) => candidate.id !== entry.id);
    invalidateMatchedRoute();
    notify();
  };
};

export const getMatchedRouteId = (): symbol | null => {
  if (!matchDirty) {
    return matchedRouteId;
  }

  const pathname = currentPath.split('?')[0] || '/';
  let fallbackId: symbol | null = null;

  for (const entry of entries) {
    const entryPath = entry.path;

    if (entryPath === pathname) {
      matchedRouteId = entry.id;
      matchDirty = false;
      return matchedRouteId;
    }

    if (fallbackId == null && entryPath === '*') {
      fallbackId = entry.id;
    }
  }

  matchedRouteId = fallbackId;
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

export const __resetRouteSystemForTest = (): void => {
  runtimeWindow?.removeEventListener('popstate', handlePopState);
  runtimeWindow = null;
  initialized = false;
  currentPath = '/';
  entries = [];
  listeners.clear();
  matchedRouteId = null;
  matchDirty = true;
  historyState = {
    __route: {
      index: 0,
      stack: ['/']
    }
  };
};
