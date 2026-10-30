<script lang="ts">
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import { seDeconnecter } from '#lib/session.svelte.ts';
</script>

<svelte:head><title>{'Compte désactivé'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Formation des arbitres · [Comité]" />

<main class="page fond-filet">
	<div class="carte" role="alert">
		<h1>Compte désactivé</h1>
		<p>Votre accès à la plateforme a été désactivé par un formateur. Vos résultats sont conservés.</p>
		<p>Si vous pensez qu’il s’agit d’une erreur, contactez votre formateur ou [adresse de contact du comité].</p>
		<button class="btn2" onclick={seDeconnecter}>Se déconnecter</button>
	</div>
</main>

<style>
	.page {
		padding: 48px 20px;
		display: flex;
		justify-content: center;
	}
	.carte {
		max-width: 520px;
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	h1 {
		margin: 0;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 30px;
	}
	p {
		margin: 0;
		line-height: 1.6;
	}
	.btn2 {
		align-self: flex-start;
	}
</style>
