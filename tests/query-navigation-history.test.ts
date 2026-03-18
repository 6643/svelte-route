import { describe, expect, test } from 'bun:test';
import { JSDOM } from 'jsdom';

import { buildPushState, buildReplaceState, normalizeHistoryState } from '../src/lib/history.ts';
import { getRawAnchorNavigationTarget, normalizeNavigationTarget } from '../src/lib/navigation.ts';
import { decodeQueryValue, decodeRouteProps } from '../src/lib/query.ts';

const createAnchor = (href: string) => {
  const { window } = new JSDOM('<a></a>');
  const anchor = window.document.querySelector('a');

  if (!anchor) {
    throw new Error('failed to create anchor');
  }

  anchor.setAttribute('href', href);
  return anchor;
};

describe('query decoders', () => {
  test('decodes Number values', () => {
    expect(decodeRouteProps('?id=12', { $id: Number })).toEqual({ id: 12 });
  });

  test('decodes Boolean values', () => {
    expect(decodeRouteProps('?enabled=true', { $enabled: Boolean })).toEqual({ enabled: true });
  });

  test('decodes String values', () => {
    expect(decodeRouteProps('?name=ann', { $name: String })).toEqual({ name: 'ann' });
  });

  test('returns undefined for missing query keys', () => {
    expect(decodeRouteProps('', { $id: Number })).toEqual({ id: undefined });
  });

  test('returns undefined for invalid Number and Boolean values', () => {
    expect(decodeQueryValue('abc', Number)).toBeUndefined();
    expect(decodeQueryValue('1', Boolean)).toBeUndefined();
  });

  test('uses the first value for duplicate query keys', () => {
    expect(decodeRouteProps('?id=1&id=2', { $id: Number })).toEqual({ id: 1 });
  });

  test('custom decoder receives string or null', () => {
    const seen: Array<string | null> = [];

    decodeRouteProps('?filter=hot', {
      $filter(raw: string | null) {
        seen.push(raw);
        return raw?.toUpperCase();
      }
    });

    decodeRouteProps('', {
      $filter(raw: string | null) {
        seen.push(raw);
        return raw ?? undefined;
      }
    });

    expect(seen).toEqual(['hot', null]);
  });

  test('custom decoder exceptions bubble', () => {
    expect(() =>
      decodeRouteProps('?id=boom', {
        $id() {
          throw new Error('decoder boom');
        }
      })
    ).toThrow('decoder boom');
  });
});

describe('navigation', () => {
  test('normalizes query only targets against current pathname', () => {
    expect(normalizeNavigationTarget('?page=2', '/user?id=1', 'https://app.test')).toBe('/user?page=2');
  });

  test('treats bare question mark as clearing search', () => {
    expect(normalizeNavigationTarget('?', '/user?id=1', 'https://app.test')).toBe('/user');
  });

  test('normalizes same origin absolute urls', () => {
    expect(normalizeNavigationTarget('https://app.test/user?id=1#hash', '/', 'https://app.test')).toBe('/user?id=1');
  });

  test('drops hash from normalized targets', () => {
    expect(normalizeNavigationTarget('/user?id=1#hash', '/', 'https://app.test')).toBe('/user?id=1');
  });

  test('treats bare relative paths as invalid', () => {
    expect(() => normalizeNavigationTarget('foo', '/', 'https://app.test')).toThrow(/Relative navigation/);
    expect(() => normalizeNavigationTarget('./foo', '/', 'https://app.test')).toThrow(/Relative navigation/);
    expect(() => normalizeNavigationTarget('../foo', '/', 'https://app.test')).toThrow(/Relative navigation/);
  });

  test('treats authored bare relative href as non-routable', () => {
    expect(getRawAnchorNavigationTarget(createAnchor('foo'))).toBeNull();
    expect(getRawAnchorNavigationTarget(createAnchor('./foo'))).toBeNull();
    expect(getRawAnchorNavigationTarget(createAnchor('../foo'))).toBeNull();
  });
});

describe('history state', () => {
  test('repairs non router managed history state and preserves foreign fields', () => {
    expect(normalizeHistoryState({ foo: 1 }, '/')).toEqual({
      foo: 1,
      __route: {
        index: 0,
        stack: ['/']
      }
    });
  });

  test('builds push state by truncating forward history', () => {
    expect(
      buildPushState(
        {
          foo: 1,
          __route: {
            index: 0,
            stack: ['/a', '/b']
          }
        },
        '/c'
      )
    ).toEqual({
      foo: 1,
      __route: {
        index: 1,
        stack: ['/a', '/c']
      }
    });
  });

  test('builds replace state without growing history', () => {
    expect(
      buildReplaceState(
        {
          foo: 1,
          __route: {
            index: 1,
            stack: ['/a', '/b']
          }
        },
        '/c'
      )
    ).toEqual({
      foo: 1,
      __route: {
        index: 1,
        stack: ['/a', '/c']
      }
    });
  });
});

describe('public api', () => {
  test('exports the route api from the public entry', async () => {
    const entry = await import('../src/lib/index.ts');

    expect(typeof entry.Route).toBe('string');
    expect(typeof entry.routePush).toBe('function');
    expect(typeof entry.routeReplace).toBe('function');
    expect(typeof entry.routeCurrentPath).toBe('function');
    expect(typeof entry.routeBackPath).toBe('function');
    expect(typeof entry.routeForwardPath).toBe('function');
    expect('__resetRouteSystemForTest' in entry).toBe(false);
  });
});
