<script lang="ts">
	import { NOM_COMITE } from '#lib/config.ts';
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	import { supabase } from '#lib/supabase.ts';

	// Deux usages : demander un lien (sans session), ou choisir un mot de passe
	// en arrivant depuis le lien d'invitation ou de réinitialisation (session de récupération).
	let email = $state('');
	let nouveau = $state('');
	let confirmation = $state('');
	let message = $state('');
	let erreur = $state('');
	let envoi = $state(false);
	// null tant que la session n'est pas lue : aucun formulaire ne s'affiche à tort.
	let modeChoix = $state<boolean | null>(null);
	let enregistre = $state(false);

	$effect(() => {
		supabase.auth.getSession().then(({ data }) => (modeChoix = !!data.session));
	});

	async function demanderLien(e: SubmitEvent) {
		e.preventDefault();
		erreur = '';
		if (!email.trim()) return void (erreur = 'Indiquez votre adresse e-mail.');
		envoi = true;
		const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
			redirectTo: `${location.origin}/mot-de-passe`
		});
		envoi = false;
		if (error) erreur = 'Envoi impossible pour le moment. Réessayez dans quelques minutes.';
		else message = 'Si un compte existe pour cette adresse, un e-mail avec un lien vient de vous être envoyé.';
	}

	async function choisir(e: SubmitEvent) {
		e.preventDefault();
		erreur = '';
		if (nouveau.length < 10) return (erreur = 'Choisissez un mot de passe d’au moins 10 caractères.');
		if (nouveau !== confirmation) return (erreur = 'Les deux mots de passe ne sont pas identiques.');
		envoi = true;
		const { error } = await supabase.auth.updateUser({ password: nouveau });
		envoi = false;
		if (error) erreur = 'Le mot de passe n’a pas pu être enregistré. Le lien a peut-être expiré : demandez-en un nouveau.';
		else {
			enregistre = true;
			setTimeout(() => location.assign('/'), 1500);
		}
	}
</script>

<svelte:head><title>{'Mot de passe'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Formation des arbitres · {NOM_COMITE}" />

<main class="page fond-filet">
	{#if modeChoix === null}
		<div class="carte"><Chargement lignes={3} /></div>
	{:else if modeChoix}
		<form class="carte" onsubmit={choisir} novalidate>
			<h1>Choisir votre mot de passe</h1>
			<label class="champ">
				Nouveau mot de passe (10 caractères minimum)
				<input type="password" bind:value={nouveau} autocomplete="new-password" />
			</label>
			<label class="champ">
				Confirmer le mot de passe
				<input type="password" bind:value={confirmation} autocomplete="new-password" />
			</label>
			{#if erreur}<p class="message-erreur" role="alert">{erreur}</p>{/if}
			<p class="message-info" role="status">{enregistre ? 'Mot de passe enregistré.' : ''}</p>
			<button class="btn" type="submit" disabled={envoi || enregistre}>{envoi ? 'Enregistrement…' : 'Enregistrer le mot de passe'}</button>
			<a href="/profil">Annuler</a>
		</form>
	{:else}
		<form class="carte" onsubmit={demanderLien} novalidate>
			<h1>Mot de passe oublié</h1>
			<p>Indiquez votre adresse e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
			<label class="champ">
				Adresse e-mail
				<input type="email" bind:value={email} autocomplete="email" />
			</label>
			{#if erreur}<p class="message-erreur" role="alert">{erreur}</p>{/if}
			{#if message}<p class="message-info" role="status">{message}</p>{/if}
			<button class="btn" type="submit" disabled={envoi}>{envoi ? 'Envoi…' : 'Recevoir un lien'}</button>
			<a href="/connexion">Retour à la connexion</a>
		</form>
	{/if}
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
	p {
		margin: 0;
	}
	.btn {
		align-self: flex-start;
	}
</style>
