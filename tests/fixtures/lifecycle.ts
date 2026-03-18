export const lifecycle = {
  syncAMounts: 0,
  syncADestroys: 0
};

export function resetLifecycle(): void {
  lifecycle.syncAMounts = 0;
  lifecycle.syncADestroys = 0;
}
