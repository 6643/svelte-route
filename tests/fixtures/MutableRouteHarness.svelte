<svelte:options runes={true} />

<script lang="ts">
  import Route from '../../src/lib/Route.svelte';

  import SyncA from './SyncA.svelte';
  import SyncB from './SyncB.svelte';

  let current = $state(SyncA);

  export function swap(): void {
    current = SyncB;
  }
</script>

<Route path="/" component={current} />
