<svelte:options runes={true} />

<script lang="ts">
  import { onMount } from 'svelte';

  import { lifecycle } from './lifecycle.ts';

  let props = $props<{ id?: number }>();

  onMount(() => {
    lifecycle.lazyMounts += 1;

    return () => {
      lifecycle.lazyDestroys += 1;
    };
  });
</script>

<div data-testid="lazy-target">{JSON.stringify(props)}</div>
