<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<span class="etiquette">{@render children()}</span>

<style>
	.etiquette {
		background: var(--papier);
		border: 1px solid var(--filet);
		padding: 5px 10px;
		border-radius: var(--r-petit);
		font-size: 13px;
		font-weight: 600;
	}
</style>
