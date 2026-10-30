<script lang="ts">
	import Chargement from '#lib/components/Chargement.svelte';
	// Saisie du code d'accès affiché en salle par le formateur. Sert aussi à reprendre une tentative interrompue.
	import '#lib/components/formulaire.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { commencerTentative, mesConvocations, type Convocation } from '#lib/data/examens-officiels.ts';
	import { ErreurServeur } from '#lib/data/seances.ts';
	import { dateHeure, etatConvocation, normaliserCode } from '#lib/examen-officiel/convocation.ts';

	const examenId = page.params.examen ?? '';
	let convocation = $state<Convocation | null>(null);
	let chargement = $state<'en_cours' | 'pret' | 'introuvable' | 'erreur'>('en_cours');
	let code = $state('');
	let envoi = $state(false);
	let erreur = $state('');

	$effect(() => {
		mesConvocations()
			.then((cs) => {
				convocation = cs.find((c) => c.examen_id === examenId) ?? null;
				chargement = convocation ? 'pret' : 'introuvable';
			})
			.catch(() => (chargement = 'erreur'));
	});

	const complet = $derived(normaliserCode(code).length === 6);
	const reprise = $derived(convocation ? etatConvocation(convocation) === 'en_cours' : false);

	async function commencer(e: SubmitEvent) {
		e.preventDefault();
		if (!complet || envoi) return;
		envoi = true;
		erreur = '';
		try {
			const tentative = await commencerTentative(examenId, normaliserCode(code));
			goto(`/tentative/${tentative}`);
		} catch (err) {
			erreur = err instanceof ErreurServeur ? err.message : 'Le serveur n’a pas pu être joint. Vérifiez votre connexion puis réessayez.';
		} finally {
			envoi = false;
		}
	}
</script>

<svelte:head><title>{'Examen officiel'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Examen officiel">
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<main class="page">
	{#if chargement === 'en_cours'}
		<Chargement />
	{:else if chargement === 'erreur'}
		<p class="message-erreur" role="alert">L’examen n’a pas pu être chargé. Vérifiez votre connexion puis rechargez la page.</p>
	{:else if chargement === 'introuvable' || !convocation}
		<h1>Examen introuvable</h1>
		<p class="aide">Vous n’êtes pas inscrit à cet examen, ou il est clos. <a href="/">Retour à l’accueil</a></p>
	{:else}
		<div class="carte">
			<h1>{convocation.titre}</h1>
			<p class="aide">{dateHeure(convocation.date_heure)}{convocation.lieu ? ` · ${convocation.lieu}` : ''} · {convocation.nb_questions} questions · {convocation.duree_minutes} minutes</p>
			{#if convocation.terminee}
				<p>Vous avez déjà passé cet examen.</p>
				<a class="btn" href="/tentative/{convocation.tentative_id}/resultat">Voir mon résultat</a>
			{:else}
				<form onsubmit={commencer}>
					<div class="champ">
						<label for="code">Code d’accès donné par votre formateur</label>
						<input id="code" class="code" bind:value={code} inputmode="numeric" autocomplete="off" maxlength="12" aria-describedby="rappel" />
					</div>
					{#if erreur}<p class="message-erreur" role="alert">{erreur}</p>{/if}
					<button class="btn" type="submit" disabled={!complet || envoi}>{reprise ? 'Reprendre l’examen' : 'Commencer l’examen'}</button>
				</form>
				<p id="rappel" class="aide">
					Une seule tentative. Le chronomètre démarre dès que vous commencez. Si la connexion coupe, vos réponses restent sur cet appareil ; en cas de fermeture, revenez ici avec le même code.
				</p>
			{/if}
		</div>
	{/if}
</main>

<style>
	.page {
		padding: 32px 40px 44px;
		max-width: 720px;
	}
	.carte {
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	h1 {
		margin: 0;
		font-size: 27px;
		font-weight: 600;
	}
	.aide {
		margin: 0;
		color: var(--doux);
		line-height: 1.6;
	}
	form {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 14px;
	}
	.code {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 32px;
		letter-spacing: 0.2em;
		width: 9em;
		font-variant-numeric: tabular-nums;
	}
	@media (max-width: 700px) {
		.page {
			padding: 24px 16px;
		}
	}
</style>
