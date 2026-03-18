function isBareRelativeHref(raw: string): boolean {
  return !raw.startsWith('/') && !raw.startsWith('?') && !raw.startsWith('#') && !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(raw);
}

export function normalizeNavigationTarget(target: string, currentPath: string, origin: string): string {
  if (target === '?') {
    return currentPath.split('?')[0] || '/';
  }

  if (target.startsWith('?')) {
    const pathname = currentPath.split('?')[0] || '/';
    const url = new URL(`${pathname}${target}`, origin);
    return url.search ? `${url.pathname}${url.search}` : url.pathname;
  }

  if (target.startsWith('/')) {
    const url = new URL(target, origin);
    return url.search ? `${url.pathname}${url.search}` : url.pathname;
  }

  if (isBareRelativeHref(target)) {
    throw new Error(`Relative navigation is not supported: ${target}`);
  }

  const url = new URL(target);
  if (url.origin !== origin) {
    throw new Error(`Cross-origin navigation is not supported: ${target}`);
  }

  return url.search ? `${url.pathname}${url.search}` : url.pathname;
}

export function getRawAnchorNavigationTarget(anchor: HTMLAnchorElement): string | null {
  const raw = anchor.getAttribute('href');

  if (!raw || raw.startsWith('#') || isBareRelativeHref(raw)) {
    return null;
  }

  return raw;
}
