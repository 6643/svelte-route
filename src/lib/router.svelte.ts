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

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function ensureBrowser(): void {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof history === 'undefined' ||
    typeof location === 'undefined'
  ) {
    throw new Error('svelte-route requires a browser environment');
  }
}

function readCurrentPath(): string {
  return `${window.location.pathname}${window.location.search}` || '/';
}

function ensureRuntime(): void {
  ensureBrowser();

  if (initialized) {
    return;
  }

  currentPath = readCurrentPath();
  historyState = normalizeHistoryState(history.state, currentPath);
  history.replaceState(historyState, '', currentPath);
  initialized = true;
}

export function initRouteSystem(): void {
  ensureRuntime();
}

function navigate(kind: 'push' | 'replace', target: string): void {
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
  notify();
}

export function subscribeRuntime(update: () => void): () => void {
  listeners.add(update);

  return () => {
    listeners.delete(update);
  };
}

export function registerRoute(entry: RouteEntry): () => void {
  ensureRuntime();
  entries = [...entries, entry];
  notify();

  return () => {
    entries = entries.filter((candidate) => candidate.id !== entry.id);
    notify();
  };
}

export function getMatchedRouteId(): symbol | null {
  const pathname = currentPath.split('?')[0] || '/';

  return entries.find((entry) => entry.path === pathname)?.id ?? entries.find((entry) => entry.path === '*')?.id ?? null;
}

export function getCurrentSearch(): string {
  return currentPath.includes('?') ? `?${currentPath.split('?').slice(1).join('?')}` : '';
}

export function routePush(path: string): void {
  navigate('push', path);
}

export function routeReplace(path: string): void {
  navigate('replace', path);
}

export function routeCurrentPath(): string {
  ensureRuntime();
  return currentPath;
}

export function routeBackPath(): string | null {
  ensureRuntime();
  return historyState.__route.stack[historyState.__route.index - 1] ?? null;
}

export function routeForwardPath(): string | null {
  ensureRuntime();
  return historyState.__route.stack[historyState.__route.index + 1] ?? null;
}

export function __resetRouteSystemForTest(): void {
  initialized = false;
  currentPath = '/';
  entries = [];
  listeners.clear();
  historyState = {
    __route: {
      index: 0,
      stack: ['/']
    }
  };
}
