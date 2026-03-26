import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { JSDOM } from 'jsdom';

import { createManagedRouteState } from '../src/lib/history.ts';
import {
  __createRouteHistoryStateForTest,
  __resetRouteSystemForTest,
  getMatchedRouteId,
  initRouteSystem,
  registerRoute,
  routeBackPath,
  routeCurrentPath,
  routeForwardPath,
  routePush,
  routeReplace,
  subscribeRuntime
} from '../src/lib/router.svelte.ts';

let cleanupDom = () => {};

const expectManagedRouteHistoryState = (
  state: Record<string, unknown>,
  expected: {
    index: number;
    stack: string[];
  }
) => {
  const route = state.__route as {
    index: number;
    stack: string[];
    signature: unknown;
  };

  expect(route.index).toBe(expected.index);
  expect(route.stack).toEqual(expected.stack);
  expect(typeof route.signature).toBe('string');
};

const installDom = (path: string) => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: `https://app.test${path}`
  });

  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    history: globalThis.history,
    location: globalThis.location
  };

  globalThis.window = dom.window as never;
  globalThis.document = dom.window.document as never;
  globalThis.history = dom.window.history as never;
  globalThis.location = dom.window.location as never;

  return () => {
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.history = previous.history;
    globalThis.location = previous.location;
    dom.window.close();
  };
};

beforeEach(() => {
  cleanupDom = installDom('/a');
  __resetRouteSystemForTest();
});

afterEach(() => {
  __resetRouteSystemForTest();
  cleanupDom();
});

describe('router runtime', () => {
  test('routePush and routeReplace update location accessors', () => {
    expect(routeCurrentPath()).toBe('/a');

    routePush('/b');
    expect(routeCurrentPath()).toBe('/b');
    expect(routeBackPath()).toBe('/a');
    expect(routeForwardPath()).toBeNull();

    routeReplace('/b?id=1');
    expect(routeCurrentPath()).toBe('/b?id=1');
    expect(routeBackPath()).toBe('/a');
    expect(routeForwardPath()).toBeNull();
  });

  test('popstate synchronizes runtime path and history accessors', () => {
    routePush('/b');

    history.replaceState(
      {
        __route: __createRouteHistoryStateForTest({
          index: 0,
          stack: ['/a', '/b']
        })
      },
      '',
      '/a'
    );
    window.dispatchEvent(new window.PopStateEvent('popstate', { state: history.state }));

    expect(routeCurrentPath()).toBe('/a');
    expect(routeBackPath()).toBeNull();
    expect(routeForwardPath()).toBe('/b');
  });

  test('same path no-op keeps back path unchanged', () => {
    routePush('/a');

    expect(routeCurrentPath()).toBe('/a');
    expect(routeBackPath()).toBeNull();
    expect(routeForwardPath()).toBeNull();
  });

  test('throws on bare relative and cross origin inputs', () => {
    expect(() => routePush('foo')).toThrow(/Relative navigation/);
    expect(() => routeReplace('https://elsewhere.test/a')).toThrow(/Cross-origin/);
  });

  test('throws outside browser', () => {
    cleanupDom();
    cleanupDom = () => {};
    __resetRouteSystemForTest();

    expect(() => routeCurrentPath()).toThrow(/browser environment/);
    expect(() => routeBackPath()).toThrow(/browser environment/);
    expect(() => routeForwardPath()).toThrow(/browser environment/);
    expect(() => routePush('/b')).toThrow(/browser environment/);
    expect(() => routeReplace('/b')).toThrow(/browser environment/);
  });

  test('initialization preserves the current hash fragment', () => {
    cleanupDom();
    cleanupDom = installDom('/a?id=1#frag');
    __resetRouteSystemForTest();

    expect(window.location.hash).toBe('#frag');
    expect(routeCurrentPath()).toBe('/a?id=1');
    expect(window.location.hash).toBe('#frag');
    expect(window.location.href).toBe('https://app.test/a?id=1#frag');
  });

  test('query only navigation preserves the current hash fragment', () => {
    cleanupDom();
    cleanupDom = installDom('/a?id=1#frag');
    __resetRouteSystemForTest();

    routePush('?id=2');
    expect(routeCurrentPath()).toBe('/a?id=2');
    expect(window.location.hash).toBe('#frag');
    expect(window.location.href).toBe('https://app.test/a?id=2#frag');

    routeReplace('?id=3');
    expect(routeCurrentPath()).toBe('/a?id=3');
    expect(window.location.hash).toBe('#frag');
    expect(window.location.href).toBe('https://app.test/a?id=3#frag');
  });

  test('popstate repairs malformed router managed history state', () => {
    history.replaceState(
      {
        foo: 1,
        __route: {
          index: -1,
          stack: [42]
        }
      },
      '',
      '/a'
    );
    window.dispatchEvent(new window.PopStateEvent('popstate', { state: history.state }));

    expect(routeCurrentPath()).toBe('/a');
    expect(routeBackPath()).toBeNull();
    expect(routeForwardPath()).toBeNull();
    expect((history.state as { foo?: number }).foo).toBe(1);
    expectManagedRouteHistoryState(history.state, {
      index: 0,
      stack: ['/a']
    });
  });

  test('popstate repairs valid-shape router managed history state from another owner', () => {
    cleanupDom();
    cleanupDom = installDom('/b');
    __resetRouteSystemForTest();

    history.replaceState(
      {
        foo: 1,
        __route: createManagedRouteState(
          {
            index: 1,
            stack: ['/a', '/b']
          },
          'foreign-owner'
        )
      },
      '',
      '/b'
    );
    window.dispatchEvent(new window.PopStateEvent('popstate', { state: history.state }));

    expect(routeCurrentPath()).toBe('/b');
    expect(routeBackPath()).toBeNull();
    expect(routeForwardPath()).toBeNull();
    expect((history.state as { foo?: number }).foo).toBe(1);
    expectManagedRouteHistoryState(history.state, {
      index: 0,
      stack: ['/b']
    });
  });

  test('notifies subscribers only when route registration changes the active match', () => {
    initRouteSystem();

    let notifications = 0;
    const unsubscribe = subscribeRuntime(() => {
      notifications += 1;
    });

    const unregisterUnmatched = registerRoute({
      id: Symbol('/b'),
      path: '/b',
      component: (() => null) as never,
      decoders: {}
    });
    expect(notifications).toBe(0);

    const unregisterFallback = registerRoute({
      id: Symbol('*'),
      path: '*',
      component: (() => null) as never,
      decoders: {}
    });
    expect(notifications).toBe(1);

    const unregisterExact = registerRoute({
      id: Symbol('/a'),
      path: '/a',
      component: (() => null) as never,
      decoders: {}
    });
    expect(notifications).toBe(2);

    unregisterUnmatched();
    expect(notifications).toBe(2);

    unregisterExact();
    expect(notifications).toBe(3);

    unregisterFallback();
    expect(notifications).toBe(4);

    unsubscribe();
  });

  test('reuses the matched route lookup until runtime state changes', () => {
    initRouteSystem();

    let reads = 0;
    const firstId = Symbol('/a');
    const secondId = Symbol('/b');

    const unregisterFirst = registerRoute({
      id: firstId,
      get path() {
        reads += 1;
        return '/a';
      },
      component: (() => null) as never,
      decoders: {}
    });

    const unregisterSecond = registerRoute({
      id: secondId,
      get path() {
        reads += 1;
        return '/b';
      },
      component: (() => null) as never,
      decoders: {}
    });

    expect(getMatchedRouteId()).toBe(firstId);
    const firstReadCount = reads;

    expect(getMatchedRouteId()).toBe(firstId);
    expect(reads).toBe(firstReadCount);

    unregisterSecond();
    unregisterFirst();
  });
});
