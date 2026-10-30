<script lang="ts">
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import { chargerProfil, session } from '#lib/session.svelte.ts';
	import { supabase } from '#lib/supabase.ts';

	let envoi = $state(false);
	let erreur = $state('');

	async function accepter() {
		if (!session.profil) return;
		envoi = true;
		const { error } = await supabase
			.from('profils')
			.update({ notice_acceptee_le: new Date().toISOString() })
			.eq('id', session.profil.id);
		envoi = false;
		if (error) erreur = 'Votre réponse n’a pas pu être enregistrée. Réessayez.';
		else await chargerProfil();
	}
</script>

<svelte:head><title>{'Vos données'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Formation des arbitres · [Comité]" />

<main class="page fond-filet">
	<article class="carte">
		<h1>Vos données sur la plateforme</h1>
		<p>
			Cette plateforme est gérée par le [Comité] pour la formation de ses arbitres et marqueurs. Elle enregistre votre
			nom, votre prénom, votre adresse e-mail, votre profil de formation, ainsi que vos réponses et résultats.
		</p>
		<h2>Qui voit quoi</h2>
		<ul>
			<li>Vos formateurs voient votre avancement en mode pédagogique et vos résultats aux examens officiels.</li>
			<li>Vos examens d’entraînement restent privés : personne d’autre que vous ne les voit.</li>
			<li>Les données sont hébergées dans l’Union européenne et ne sont transmises à personne d’autre.</li>
		</ul>
		<h2>Combien de temps</h2>
		<p>
			Vos données sont supprimées 2 ans après la désactivation de votre compte. Vous pouvez demander leur suppression à
			tout moment à votre formateur ou à [adresse de contact du comité].
		</p>
		<p>Si vous êtes mineur, vos parents ont été informés par votre formateur lors de la création de votre compte.</p>
		{#if erreur}<p class="message-erreur" role="alert">{erreur}</p>{/if}
		<button class="btn" onclick={accepter} disabled={envoi}>{envoi ? 'Enregistrement…' : 'J’ai lu cette notice'}</button>
	</article>
</main>

<style>
	.page {
		padding: 40px 20px;
		display: flex;
		justify-content: center;
	}
	.carte {
		width: 100%;
		max-width: 680px;
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 32px 36px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		line-height: 1.6;
	}
	h1 {
		margin: 0;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 30px;
	}
	h2 {
		margin: 10px 0 0;
		font-size: 18px;
	}
	p,
	ul {
		margin: 0;
	}
	.btn {
		align-self: flex-start;
		margin-top: 8px;
	}
</style>
