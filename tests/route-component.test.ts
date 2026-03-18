import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import Route from '../src/lib/Route.svelte';
import {
  __resetRouteSystemForTest,
  routeBackPath,
  routeCurrentPath,
  routePush,
  routeReplace
} from '../src/lib/router.svelte.ts';
import LazyTarget from './fixtures/LazyTarget.svelte';
import MutableRouteHarness from './fixtures/MutableRouteHarness.svelte';
import NotFound from './fixtures/NotFound.svelte';
import SyncA from './fixtures/SyncA.svelte';
import SyncB from './fixtures/SyncB.svelte';
import { lifecycle, resetLifecycle } from './fixtures/lifecycle.ts';

function resetBrowser(path: string): void {
  history.replaceState({}, '', path);
  document.body.innerHTML = '';
  resetLifecycle();
  __resetRouteSystemForTest();
}

afterEach(() => {
  resetBrowser('/');
});

describe('Route component', () => {
  it('renders the first exact route match and injects decoded query props', () => {
    resetBrowser('/user?id=7');
    const target = document.createElement('div');
    document.body.append(target);

    mount(Route, { target, props: { path: '/', component: SyncA } });
    mount(Route, { target, props: { path: '/user', component: SyncA, $id: Number } });
    flushSync();

    expect(target.querySelector('[data-testid="sync-a"]')?.textContent).toContain('"id":7');
  });

  it('renders wildcard route when no exact path matches', () => {
    resetBrowser('/missing');
    const target = document.createElement('div');
    document.body.append(target);

    mount(Route, { target, props: { path: '*', component: NotFound } });
    flushSync();

    expect(target.querySelector('[data-testid="not-found"]')?.textContent).toBe('not-found');
  });

  it('query only navigation updates props without remounting', () => {
    resetBrowser('/user?id=1');
    const target = document.createElement('div');
    document.body.append(target);

    mount(Route, { target, props: { path: '/user', component: SyncA, $id: Number } });
    flushSync();
    expect(lifecycle.syncAMounts).toBe(1);

    flushSync(() => {
      routePush('?id=2');
    });

    expect(lifecycle.syncAMounts).toBe(1);
    expect(target.querySelector('[data-testid="sync-a"]')?.textContent).toContain('"id":2');
  });

  it('path changes remount the component', () => {
    resetBrowser('/a');
    const target = document.createElement('div');
    document.body.append(target);

    mount(Route, { target, props: { path: '/a', component: SyncA } });
    mount(Route, { target, props: { path: '/b', component: SyncB } });
    flushSync();

    expect(lifecycle.syncAMounts).toBe(1);

    flushSync(() => {
      routePush('/b');
    });

    expect(lifecycle.syncADestroys).toBe(1);
    expect(lifecycle.syncBMounts).toBe(1);
  });

  it('throws when component changes after mount', () => {
    resetBrowser('/');
    const target = document.createElement('div');
    document.body.append(target);

    const app = mount(MutableRouteHarness, { target });

    expect(() => {
      flushSync(() => {
        app.swap();
      });
    }).toThrowError(/component/i);

    void unmount(app);
  });

  it('throws for invalid extra props', () => {
    resetBrowser('/');
    const target = document.createElement('div');
    document.body.append(target);

    expect(() =>
      mount(Route, {
        target,
        props: {
          path: '/',
          component: SyncA,
          invalid: 'nope'
        }
      })
    ).toThrowError(/Unsupported Route prop/);
  });

  it('passes $path and $component to the child as path and component props', () => {
    resetBrowser('/debug?path=one&component=two');
    const target = document.createElement('div');
    document.body.append(target);

    mount(Route, {
      target,
      props: {
        path: '/debug',
        component: SyncA,
        $path: String,
        $component: String
      }
    });
    flushSync();

    const text = target.querySelector('[data-testid="sync-a"]')?.textContent ?? '';
    expect(text).toContain('"path":"one"');
    expect(text).toContain('"component":"two"');
  });

  it('renders lazy routes without default loading dom', async () => {
    resetBrowser('/lazy?id=9');
    const target = document.createElement('div');
    document.body.append(target);

    let resolveLoader: ((value: { default: typeof LazyTarget }) => void) | undefined;
    const Lazy = () =>
      new Promise<{ default: typeof LazyTarget }>((resolve) => {
        resolveLoader = resolve;
      });

    mount(Route, { target, props: { path: '/lazy', component: Lazy, $id: Number } });
    flushSync();
    expect(target.textContent).toBe('');

    resolveLoader?.({ default: LazyTarget });
    await Promise.resolve();
    await Promise.resolve();

    expect(target.querySelector('[data-testid="lazy-target"]')?.textContent).toContain('"id":9');
  });
});

describe('router runtime', () => {
  it('routePush and routeReplace update location accessors', () => {
    resetBrowser('/a');
    const target = document.createElement('div');
    document.body.append(target);

    mount(Route, { target, props: { path: '/a', component: SyncA } });
    mount(Route, { target, props: { path: '/b', component: SyncB } });
    flushSync();

    flushSync(() => {
      routePush('/b');
    });
    expect(routeCurrentPath()).toBe('/b');
    expect(routeBackPath()).toBe('/a');

    routeReplace('/b?id=1');
    expect(routeCurrentPath()).toBe('/b?id=1');
    expect(routeBackPath()).toBe('/a');
  });

  it('same path no-op keeps back path unchanged', () => {
    resetBrowser('/a');
    const target = document.createElement('div');
    document.body.append(target);

    mount(Route, { target, props: { path: '/a', component: SyncA } });
    flushSync();

    flushSync(() => {
      routePush('/a');
    });

    expect(routeCurrentPath()).toBe('/a');
    expect(routeBackPath()).toBeNull();
  });

  it('throws on bare relative and cross origin inputs', () => {
    resetBrowser('/a');
    const target = document.createElement('div');
    document.body.append(target);

    mount(Route, { target, props: { path: '/a', component: SyncA } });
    flushSync();

    expect(() => routePush('foo')).toThrowError(/Relative navigation/);
    expect(() => routeReplace('https://elsewhere.test/a')).toThrowError(/Cross-origin/);
  });
});
