import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { JSDOM } from 'jsdom';

import {
  __resetRouteSystemForTest,
  routeBackPath,
  routeCurrentPath,
  routeForwardPath,
  routePush,
  routeReplace
} from '../src/lib/router.svelte.ts';

let cleanupDom = () => {};

function installDom(path: string) {
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
}

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
});
