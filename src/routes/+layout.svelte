<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import '#lib/styles/base.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Arbitrage volley</title>
</svelte:head>

{@render children()}
