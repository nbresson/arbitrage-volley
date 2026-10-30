<script lang="ts">
	import { CONTACT_EMAIL, lienContact } from '#lib/config.ts';
	// Page d'erreur : « Ballon hors terrain » pour une adresse inconnue ; sinon un message calme, une action, un contact.
	import '#lib/components/formulaire.css';
	import { page } from '$app/state';
	import Bandeau from '#lib/components/Bandeau.svelte';

	const introuvable = $derived(page.status === 404);
</script>

<svelte:head><title>{introuvable ? 'Page introuvable' : 'Service indisponible'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Formation des arbitres" />

<main class="page">
	<svg width="180" height="110" viewBox="0 0 180 110" fill="none" aria-hidden="true">
		<path d="M10 96h120" stroke="var(--filet)" stroke-width="3" stroke-linecap="round" />
		<path d="M130 20v76" stroke="var(--trait)" stroke-width="3" stroke-linecap="round" />
		<path d="M10 96V60" stroke="var(--filet)" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 6" />
		<circle cx="156" cy="84" r="16" fill="var(--papier)" stroke="var(--trait)" stroke-width="2.5" />
		<path d="M156 68c-4 5-4 11 0 16s4 11 0 16M141 79c5 1 10 1 15 5s10 4 15 4" stroke="var(--trait)" stroke-width="2" stroke-linecap="round" />
	</svg>
	{#if introuvable}
		<h1 class="titre-page"><span class="surtitre">Erreur 404</span>Ballon hors terrain</h1>
		<p>Cette page n’existe pas, ou plus. Le lien était peut-être incomplet.</p>
		<div class="actions">
			<a class="btn" href="/">Retour à l’accueil</a>
			<a href="/regles">Consulter les règles</a>
		</div>
	{:else}
		<h1 class="titre-page"><span class="surtitre">Un instant</span>Le service ne répond pas pour le moment</h1>
		<p>Vos réponses déjà enregistrées ne sont pas perdues. Réessayez dans quelques minutes.</p>
		<p>Si le problème dure, prévenez votre formateur ou écrivez à <a href={lienContact}>{CONTACT_EMAIL}</a>.</p>
		<div class="actions">
			<button type="button" class="btn" onclick={() => location.reload()}>Réessayer</button>
			<a href="/">Retour à l’accueil</a>
		</div>
	{/if}
</main>

<style>
	.page {
		max-width: 720px;
		margin: 0 auto;
		padding: 48px 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	p {
		margin: 0;
		line-height: 1.6;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px 20px;
		align-items: center;
	}
</style>
