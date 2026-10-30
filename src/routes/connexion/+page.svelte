<script lang="ts">
	import { NOM_COMITE } from '#lib/config.ts';
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import { supabase } from '#lib/supabase.ts';

	let email = $state('');
	let motDePasse = $state('');
	let erreur = $state('');
	let envoi = $state(false);

	async function seConnecter(e: SubmitEvent) {
		e.preventDefault();
		erreur = '';
		envoi = true;
		const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse });
		envoi = false;
		if (error) {
			erreur =
				error.status === 400
					? 'Adresse e-mail ou mot de passe incorrect.'
					: 'Connexion impossible pour le moment. Vérifiez votre connexion puis réessayez.';
		}
		// En cas de succès, le layout recharge le profil et redirige.
	}
</script>

<svelte:head><title>{'Connexion'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Formation des arbitres · {NOM_COMITE}" />

<main class="page fond-filet">
	<form class="carte" onsubmit={seConnecter} novalidate>
		<h1>Se connecter</h1>
		<label class="champ">
			Adresse e-mail
			<input type="email" bind:value={email} autocomplete="email" required />
		</label>
		<label class="champ">
			Mot de passe
			<input type="password" bind:value={motDePasse} autocomplete="current-password" required />
		</label>
		{#if erreur}<p class="message-erreur" role="alert">{erreur}</p>{/if}
		<button class="btn" type="submit" disabled={envoi || !email || !motDePasse}>
			{envoi ? 'Connexion…' : 'Se connecter'}
		</button>
		<a href="/mot-de-passe">Mot de passe oublié ?</a>
		<p class="aide">Pas de compte ? Votre formateur crée votre accès et vous envoie une invitation par e-mail.</p>
	</form>
</main>

<style>
	.page {
		padding: 48px 20px;
		display: flex;
		justify-content: center;
	}
	.carte {
		width: 100%;
		max-width: 440px;
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	h1 {
		margin: 0;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 30px;
	}
	.btn {
		align-self: flex-start;
	}
	.aide {
		margin: 0;
		font-size: 14px;
		color: var(--doux);
	}
</style>
