<script lang="ts">
	// Salle d'examen : écran d'attente, test de connexion, code d'accès en six cases. Sert aussi à reprendre une tentative.
	import '#lib/components/formulaire.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	import CodeSixCases from '#lib/components/CodeSixCases.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { commencerTentative, mesConvocations, mesurerConnexion, type Convocation } from '#lib/data/examens-officiels.ts';
	import { ErreurServeur } from '#lib/data/seances.ts';
	import { dateHeure, etatConvocation, normaliserCode } from '#lib/examen-officiel/convocation.ts';
	import type { QualiteConnexion } from '#lib/examen-officiel/salle.ts';

	const examenId = page.params.examen ?? '';
	let convocation = $state<Convocation | null>(null);
	let chargement = $state<'en_cours' | 'pret' | 'introuvable' | 'erreur'>('en_cours');
	let code = $state('');
	let envoi = $state(false);
	let erreur = $state('');
	let connexion = $state<QualiteConnexion | null>(null);
	let test = $state(false);

	async function lire() {
		const cs = await mesConvocations();
		convocation = cs.find((c) => c.examen_id === examenId) ?? null;
		chargement = convocation ? 'pret' : 'introuvable';
	}

	$effect(() => {
		lire().catch(() => (chargement = 'erreur'));
		tester();
	});

	const etat = $derived(convocation ? etatConvocation(convocation) : null);

	// En attendant que le formateur ouvre l'examen, la page se met à jour toute seule.
	$effect(() => {
		if (etat !== 'a_venir') return;
		const t = setInterval(() => lire().catch(() => {}), 15_000);
		return () => clearInterval(t);
	});

	async function tester() {
		test = true;
		connexion = await mesurerConnexion();
		test = false;
	}

	const complet = $derived(normaliserCode(code).length === 6);
	const reprise = $derived(etat === 'en_cours');

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
			<p class="surtitre">Examen officiel</p>
			<h1>{convocation.titre}</h1>
			<p class="aide">{convocation.nb_questions} questions · {convocation.duree_minutes} minutes · une seule tentative</p>
			{#if convocation.terminee}
				<p>Vous avez déjà passé cet examen.</p>
				<a class="btn" href="/tentative/{convocation.tentative_id}/resultat">Voir mon résultat</a>
			{:else}
				{#if !reprise}
					<div class="attente">
						<p class="grand">L’examen commence quand votre formateur donne le code.</p>
						<p>{dateHeure(convocation.date_heure)}{convocation.lieu ? ` · ${convocation.lieu}` : ''}</p>
						{#if etat === 'a_venir'}
							<p class="aide" role="status">Votre formateur n’a pas encore ouvert l’examen. Cette page se met à jour toute seule.</p>
						{/if}
					</div>
				{/if}

				<div class="connexion {connexion?.etat ?? ''}" role="status">
					{#if test || !connexion}
						<span>Test de la connexion…</span>
					{:else}
						<span class="pastille" aria-hidden="true"></span><span>{connexion.texte}</span>
						<button type="button" class="lien" onclick={tester}>Refaire le test</button>
					{/if}
				</div>

				<form onsubmit={commencer}>
					<p class="libelle" id="libelle-code">Code d’accès donné par votre formateur</p>
					<CodeSixCases bind:valeur={code} libelle="Code d’accès donné par votre formateur" idDescription="rappel" desactive={etat === 'a_venir'} />
					{#if erreur}<p class="message-erreur" role="alert">{erreur}</p>{/if}
					<button class="btn" type="submit" disabled={!complet || envoi || etat === 'a_venir'}>{reprise ? 'Reprendre l’examen' : 'Commencer l’examen'}</button>
				</form>
				<p id="rappel" class="aide">
					Le chronomètre démarre dès que vous commencez. Restez sur l’écran de l’examen : chaque sortie est enregistrée. Si la connexion coupe, vos réponses restent sur cet appareil ; en cas de fermeture, revenez ici avec le même code.
				</p>
				<a class="imprimer" href="/convocation/{convocation.examen_id}">Imprimer la convocation</a>
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
	.surtitre {
		margin: 0;
	}
	.attente {
		border: 1px solid var(--filet);
		border-radius: var(--r);
		background: var(--ligne-survol);
		padding: 16px 18px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.attente p {
		margin: 0;
	}
	.grand {
		font-size: 19px;
		font-weight: 700;
	}
	.connexion {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 10px;
		font-weight: 600;
	}
	.pastille {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--doux);
	}
	.stable .pastille {
		background: var(--bleu);
	}
	.instable .pastille,
	.hors_ligne .pastille {
		background: var(--ambre-vif);
	}
	.instable,
	.hors_ligne {
		color: var(--ambre);
	}
	.libelle {
		margin: 0;
		font-weight: 600;
	}
	.lien {
		font: inherit;
		font-weight: 500;
		background: none;
		border: 0;
		padding: 0;
		color: var(--bleu-texte);
		text-decoration: underline;
		cursor: pointer;
	}
	.imprimer {
		align-self: flex-start;
	}
	@media (max-width: 700px) {
		.page {
			padding: 24px 16px;
		}
	}
</style>
