<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from 'svelte';

  import { lifecycle } from './lifecycle.ts';

  let props = $props<{ id?: number }>();

  onMount(() => {
    lifecycle.syncBMounts += 1;

    return () => {
      lifecycle.syncBDestroys += 1;
    };
  });
</script>

<div data-testid="sync-b">{JSON.stringify(props)}</div>
