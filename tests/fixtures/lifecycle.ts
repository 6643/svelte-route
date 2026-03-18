export const lifecycle = {
  syncAMounts: 0,
  syncADestroys: 0,
  syncBMounts: 0,
  syncBDestroys: 0,
  lazyMounts: 0,
  lazyDestroys: 0
};

export function resetLifecycle(): void {
  lifecycle.syncAMounts = 0;
  lifecycle.syncADestroys = 0;
  lifecycle.syncBMounts = 0;
  lifecycle.syncBDestroys = 0;
  lifecycle.lazyMounts = 0;
  lifecycle.lazyDestroys = 0;
}
