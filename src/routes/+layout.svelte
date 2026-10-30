<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import '#lib/styles/base.css';
	import { goto, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { garde } from '#lib/auth.ts';
	import Chargement from '#lib/components/Chargement.svelte';
	import { chargerProfil, session } from '#lib/session.svelte.ts';
	import { supabase } from '#lib/supabase.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	$effect(() => {
		chargerProfil();
		// Ne pas appeler Supabase directement dans ce rappel (blocage possible) : on diffère le chargement.
		const { data } = supabase.auth.onAuthStateChange(() => {
			setTimeout(chargerProfil, 0);
		});
		return () => data.subscription.unsubscribe();
	});

	// Fondu court entre les pages (API View Transitions), sauf si l'on réduit les animations.
	onNavigate((navigation) => {
		if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	// Redirige selon la session et le rôle (voir garde() dans #lib/auth).
	$effect(() => {
		if (!session.pret) return;
		const cible = garde(session.profil, page.url.pathname);
		if (cible && cible !== page.url.pathname) goto(cible, { replaceState: true });
	});

	const autorise = $derived(session.pret && garde(session.profil, page.url.pathname) === null);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if autorise}
	{@render children()}
{:else}
	<div class="chargement"><Chargement lignes={4} /></div>
{/if}

<style>
	.chargement {
		padding: 40px;
		max-width: 960px;
	}
</style>
