<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import '#lib/styles/base.css';
	import { goto, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { garde } from '#lib/auth.ts';
	import AideRaccourcis from '#lib/components/AideRaccourcis.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	import { actionGlobale, estSaisie } from '#lib/raccourcis-globaux.ts';
	import { animationsReduites } from '#lib/preferences.ts';
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

	// Application installable et règles lisibles hors ligne (static/sw.js), seulement sur le site compilé.
	$effect(() => {
		if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
	});

	// Fondu court entre les pages (API View Transitions), sauf si l'on réduit les animations.
	onNavigate((navigation) => {
		if (!document.startViewTransition || animationsReduites()) return;
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

	// Raccourcis globaux : « / » cherche une règle, « ? » liste les raccourcis.
	let aideRaccourcis = $state(false);
	async function touche(e: KeyboardEvent) {
		// Pendant un examen, aucun raccourci ne doit faire quitter l'écran.
		if (!autorise || !session.profil || /^\/(tentative|examen-entrainement)\/[^/]+$/.test(page.url.pathname)) return;
		const action = actionGlobale({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, saisie: estSaisie(e.target) });
		if (!action) return;
		e.preventDefault();
		if (action === 'aide') return void (aideRaccourcis = true);
		if (page.url.pathname !== '/regles') await goto('/regles');
		document.getElementById('recherche-regles')?.focus();
	}

	const autorise = $derived(session.pret && garde(session.profil, page.url.pathname) === null);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svelte:window onkeydown={touche} />
<AideRaccourcis bind:ouvert={aideRaccourcis} />

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
