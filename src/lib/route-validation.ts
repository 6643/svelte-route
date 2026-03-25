export const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  !!value && (typeof value === 'object' || typeof value === 'function') && typeof (value as { then?: unknown }).then === 'function';
