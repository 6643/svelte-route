import { describe, expect, it } from 'vitest';

import { decodeQueryValue, decodeRouteProps } from '../src/lib/query.ts';
import { buildPushState, buildReplaceState, normalizeHistoryState } from '../src/lib/history.ts';
import { getRawAnchorNavigationTarget, normalizeNavigationTarget } from '../src/lib/navigation.ts';

describe('query decoders', () => {
  it('decodes Number values', () => {
    expect(decodeRouteProps('?id=12', { $id: Number })).toEqual({ id: 12 });
  });

  it('decodes Boolean values', () => {
    expect(decodeRouteProps('?enabled=true', { $enabled: Boolean })).toEqual({ enabled: true });
  });

  it('decodes String values', () => {
    expect(decodeRouteProps('?name=ann', { $name: String })).toEqual({ name: 'ann' });
  });

  it('returns undefined for missing query keys', () => {
    expect(decodeRouteProps('', { $id: Number })).toEqual({ id: undefined });
  });

  it('returns undefined for invalid Number and Boolean values', () => {
    expect(decodeQueryValue('abc', Number)).toBeUndefined();
    expect(decodeQueryValue('1', Boolean)).toBeUndefined();
  });

  it('uses the first value for duplicate query keys', () => {
    expect(decodeRouteProps('?id=1&id=2', { $id: Number })).toEqual({ id: 1 });
  });

  it('custom decoder receives string or null', () => {
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

  it('custom decoder exceptions bubble', () => {
    expect(() =>
      decodeRouteProps('?id=boom', {
        $id() {
          throw new Error('decoder boom');
        }
      })
    ).toThrowError('decoder boom');
  });
});

describe('navigation', () => {
  it('normalizes query only targets against current pathname', () => {
    expect(normalizeNavigationTarget('?page=2', '/user?id=1', 'https://app.test')).toBe('/user?page=2');
  });

  it('treats bare question mark as clearing search', () => {
    expect(normalizeNavigationTarget('?', '/user?id=1', 'https://app.test')).toBe('/user');
  });

  it('normalizes same origin absolute urls', () => {
    expect(normalizeNavigationTarget('https://app.test/user?id=1#hash', '/', 'https://app.test')).toBe('/user?id=1');
  });

  it('drops hash from normalized targets', () => {
    expect(normalizeNavigationTarget('/user?id=1#hash', '/', 'https://app.test')).toBe('/user?id=1');
  });

  it('treats bare relative paths as invalid', () => {
    expect(() => normalizeNavigationTarget('foo', '/', 'https://app.test')).toThrowError(/Relative navigation/);
    expect(() => normalizeNavigationTarget('./foo', '/', 'https://app.test')).toThrowError(/Relative navigation/);
    expect(() => normalizeNavigationTarget('../foo', '/', 'https://app.test')).toThrowError(/Relative navigation/);
  });

  it('treats authored bare relative href as non-routable', () => {
    const anchor = document.createElement('a');

    anchor.setAttribute('href', 'foo');
    expect(getRawAnchorNavigationTarget(anchor)).toBeNull();

    anchor.setAttribute('href', './foo');
    expect(getRawAnchorNavigationTarget(anchor)).toBeNull();

    anchor.setAttribute('href', '../foo');
    expect(getRawAnchorNavigationTarget(anchor)).toBeNull();
  });
});

describe('history state', () => {
  it('repairs non router managed history state and preserves foreign fields', () => {
    expect(normalizeHistoryState({ foo: 1 }, '/')).toEqual({
      foo: 1,
      __route: {
        index: 0,
        stack: ['/']
      }
    });
  });

  it('builds push state by truncating forward history', () => {
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

  it('builds replace state without growing history', () => {
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
  it('exports the route api from the public entry', async () => {
    const entry = await import('../src/lib/index.ts');

    expect(entry).toHaveProperty('Route');
    expect(entry).toHaveProperty('routePush');
    expect(entry).toHaveProperty('routeReplace');
    expect(entry).toHaveProperty('routeCurrentPath');
    expect(entry).toHaveProperty('routeBackPath');
    expect(entry).toHaveProperty('routeForwardPath');
    expect(entry).not.toHaveProperty('__resetRouteSystemForTest');
  });
});
