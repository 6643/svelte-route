<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from 'svelte';

  import { lifecycle } from './lifecycle.ts';

  let props = $props<{ id?: number; path?: string; component?: string }>();

  onMount(() => {
    lifecycle.syncAMounts += 1;

    return () => {
      lifecycle.syncADestroys += 1;
    };
  });
</script>

<div data-testid="sync-a">{JSON.stringify(props)}</div>
