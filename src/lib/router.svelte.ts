import { decodeRouteProps } from './query.ts';
import { buildPushState, buildReplaceState, normalizeHistoryState } from './history.ts';
import { getRawAnchorNavigationTarget, normalizeNavigationTarget } from './navigation.ts';
import type { RouteDecoderMap, RouteEntry, RouteHistoryState } from './types.ts';

export const routerState = $state({
  entries: [] as RouteEntry[],
  currentPath: '/',
  historyState: {
    __route: {
      index: 0,
      stack: ['/']
    }
  } as RouteHistoryState
});
let initialized = false;
let removeBrowserListeners: (() => void) | null = null;

function inBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && typeof history !== 'undefined';
}

function ensureBrowser(): void {
  if (!inBrowser()) {
    throw new Error('svelte-route requires a browser environment');
  }
}

function readCurrentPath(): string {
  return `${window.location.pathname}${window.location.search}` || '/';
}

function syncFromBrowser(): void {
  const nextPath = readCurrentPath();
  const nextHistoryState = normalizeHistoryState(history.state, nextPath);

  routerState.currentPath = nextPath;
  routerState.historyState = nextHistoryState;

  if (history.state !== nextHistoryState) {
    history.replaceState(nextHistoryState, '', nextPath);
  }
}

function handleDocumentClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const anchor = target.closest('a');
  if (!(anchor instanceof HTMLAnchorElement)) {
    return;
  }

  const targetAttr = anchor.getAttribute('target');
  if (targetAttr && targetAttr !== '_self') {
    return;
  }

  if (anchor.hasAttribute('download')) {
    return;
  }

  const raw = getRawAnchorNavigationTarget(anchor);
  if (!raw) {
    return;
  }

  try {
    const nextPath = normalizeNavigationTarget(raw, routerState.currentPath, window.location.origin);
    event.preventDefault();

    if (nextPath !== routerState.currentPath) {
      navigate('push', raw);
    }
  } catch {
    return;
  }
}

function ensureRuntime(): void {
  ensureBrowser();

  if (initialized) {
    return;
  }

  syncFromBrowser();

  const popstate = (): void => {
    syncFromBrowser();
  };

  const click = (event: MouseEvent): void => {
    handleDocumentClick(event);
  };

  window.addEventListener('popstate', popstate);
  document.addEventListener('click', click);

  removeBrowserListeners = () => {
    window.removeEventListener('popstate', popstate);
    document.removeEventListener('click', click);
  };

  initialized = true;
}

export function initRouteSystem(): void {
  ensureRuntime();
}

function navigate(kind: 'push' | 'replace', target: string): void {
  ensureRuntime();

  const nextPath = normalizeNavigationTarget(target, routerState.currentPath, window.location.origin);
  if (nextPath === routerState.currentPath) {
    return;
  }

  const nextState = kind === 'push' ? buildPushState(routerState.historyState, nextPath) : buildReplaceState(routerState.historyState, nextPath);

  if (kind === 'push') {
    history.pushState(nextState, '', nextPath);
  } else {
    history.replaceState(nextState, '', nextPath);
  }

  routerState.currentPath = nextPath;
  routerState.historyState = nextState;
}

export function registerRoute(entry: RouteEntry): () => void {
  ensureRuntime();
  routerState.entries = [...routerState.entries, entry];

  return () => {
    routerState.entries = routerState.entries.filter((candidate) => candidate.id !== entry.id);
  };
}

export function routePush(path: string): void {
  navigate('push', path);
}

export function routeReplace(path: string): void {
  navigate('replace', path);
}

export function routeCurrentPath(): string {
  ensureRuntime();
  return routerState.currentPath;
}

export function routeBackPath(): string | null {
  ensureRuntime();
  return routerState.historyState.__route.stack[routerState.historyState.__route.index - 1] ?? null;
}

export function routeForwardPath(): string | null {
  ensureRuntime();
  return routerState.historyState.__route.stack[routerState.historyState.__route.index + 1] ?? null;
}

export function getMatchedRouteId(): symbol | null {
  const pathname = routerState.currentPath.split('?')[0] || '/';

  return routerState.entries.find((entry) => entry.path === pathname)?.id ?? routerState.entries.find((entry) => entry.path === '*')?.id ?? null;
}

export function getCurrentSearch(): string {
  return routerState.currentPath.includes('?') ? `?${routerState.currentPath.split('?').slice(1).join('?')}` : '';
}

export function getDecodedProps(decoders: RouteDecoderMap): Record<string, unknown> {
  return decodeRouteProps(getCurrentSearch(), decoders);
}

export function __resetRouteSystemForTest(): void {
  removeBrowserListeners?.();
  removeBrowserListeners = null;
  routerState.entries = [];
  routerState.currentPath = '/';
  routerState.historyState = {
    __route: {
      index: 0,
      stack: ['/']
    }
  };
  initialized = false;
}
