<script lang="ts">
	import '#lib/components/formulaire.css';
	import { page } from '$app/state';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import Etiquette from '#lib/components/Etiquette.svelte';
	import Filet from '#lib/components/Filet.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import PanneauDecision from '#lib/components/PanneauDecision.svelte';
	import Reponse, { type EtatReponse } from '#lib/components/Reponse.svelte';
	import { urlRegle } from '#lib/data/regles.ts';
	import { questionsDeSeance, terminerSeance, validerReponse, type BilanSeance } from '#lib/data/seances.ts';
	import {
		choisir,
		debutValidation,
		echecValidation,
		etatInitial,
		finValidation,
		suivante,
		type EtatPedago,
		type ResultatValidation,
		type SourceCitee
	} from '#lib/seance/pedagogique.ts';

	const seanceId = page.params.seance ?? '';
	let etat = $state<EtatPedago | null>(null);
	let chargement = $state<'en_cours' | 'pret' | 'erreur'>('en_cours');
	let bilan = $state<BilanSeance | null>(null);
	let aRevoir = $state<{ question: string; source: SourceCitee | undefined }[]>([]);
	let panneau = $state<HTMLElement>();

	$effect(() => {
		questionsDeSeance(seanceId)
			.then((qs) => {
				const repondues = qs.filter((q) => q.correcte_precedente !== null);
				const e = etatInitial(
					qs,
					repondues.filter((q) => q.correcte_precedente).length,
					repondues.filter((q) => q.correcte_precedente === false).length
				);
				const premiere = qs.findIndex((q) => q.correcte_precedente === null);
				etat = { ...e, index: premiere === -1 ? 0 : premiere, terminee: premiere === -1 };
				chargement = 'pret';
				if (premiere === -1) terminer();
			})
			.catch(() => (chargement = 'erreur'));
	});

	const question = $derived(etat ? etat.questions[etat.index] : null);
	const bonne = $derived(question && etat?.resultat ? question.propositions.find((p) => p.id === etat!.resultat!.bonne_proposition_id) : null);

	function etatReponse(id: string): EtatReponse {
		if (!etat?.resultat) return 'neutre';
		if (id === etat.resultat.bonne_proposition_id) return 'ok';
		if (id === etat.choix) return 'ko';
		return 'ecartee';
	}

	async function valider() {
		if (!etat || !question) return;
		const avant = etat;
		etat = debutValidation(etat);
		if (etat === avant) return; // pas de choix, déjà corrigé ou envoi en cours
		try {
			const r = (await validerReponse(seanceId, question.question_id, etat.choix!)) as ResultatValidation;
			etat = finValidation(etat, r);
			if (!r.correcte) aRevoir.push({ question: question.enonce, source: r.sources.find((s) => s.principale) ?? r.sources[0] });
			// Sur écran étroit, la décision est sous la question : on y amène le focus.
			if (window.innerWidth < 1000) panneau?.focus();
		} catch {
			etat = echecValidation(etat);
		}
	}

	async function terminer() {
		try {
			bilan = await terminerSeance(seanceId);
		} catch {
			chargement = 'erreur';
		}
	}

	function continuer() {
		if (!etat) return;
		etat = suivante(etat);
		if (etat.terminee) terminer();
	}

	const compteurs = $derived(
		etat
			? [
					{ valeur: etat.index + 1, chiffres: 2, libelle: `Question / ${etat.questions.length}` },
					{ valeur: etat.acquises, chiffres: 2, libelle: 'Acquises', couleur: 'bleu' as const },
					{ valeur: etat.aRevoir, chiffres: 2, libelle: 'À revoir', couleur: 'rouge' as const }
				]
			: []
	);
	const resume = $derived(
		etat ? `Question ${etat.index + 1}/${etat.questions.length} · ${etat.acquises} acquises · ${etat.aRevoir} à revoir` : ''
	);
</script>

<Bandeau titre="Arbitrage volley" sousTitre="Mode pédagogique" {compteurs} resumeTexte={resume}>
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

{#if chargement === 'en_cours'}
	<p class="etat" role="status">Chargement de la séance…</p>
{:else if chargement === 'erreur'}
	<p class="etat message-erreur" role="alert">La séance n’a pas pu être chargée. Vérifiez votre connexion puis rechargez la page.</p>
{:else if etat?.terminee}
	<main class="fin">
		<h1>Séance terminée</h1>
		{#if bilan}
			<p class="score"><span class="chiffres">{bilan.score} / {bilan.total}</span> bonnes réponses</p>
		{/if}
		{#if aRevoir.length}
			<h2>À revoir</h2>
			<ul>
				{#each aRevoir as r, i (i)}
					<li>
						{r.question}
						{#if r.source}— <a href={urlRegle(r.source)}>{r.source.reference}</a>{/if}
					</li>
				{/each}
			</ul>
		{/if}
		<div class="actions">
			<a class="btn" href="/entrainement/nouvelle">Nouvelle séance</a>
			<a href="/">Retour à l’accueil</a>
		</div>
	</main>
{:else if etat && question}
	<div class="jeu">
		<section class="situation">
			<div class="meta">
				<Etiquette>{question.theme}</Etiquette>
				<Etiquette>{question.niveau}</Etiquette>
				<span class="mode">Mode pédagogique</span>
			</div>
			<h1 id="enonce">{question.enonce}</h1>
			{#if question.video_url}
				<p><a href={question.video_url} target="_blank" rel="noopener">Voir la vidéo de la situation (nouvel onglet)</a></p>
			{/if}
			<fieldset aria-describedby="enonce">
				<legend class="vh">Propositions de réponse</legend>
				{#each question.propositions as p (p.id)}
					<Reponse
						nom="reponse-{question.question_id}"
						valeur={p.id}
						lettre={p.lettre}
						texte={p.texte}
						etat={etatReponse(p.id)}
						choisie={etat.choix === p.id}
						desactivee={!!etat.resultat || etat.envoi === 'en_cours'}
						onchoisir={(v) => (etat = choisir(etat!, v))}
					/>
				{/each}
			</fieldset>
			<div class="actions">
				{#if etat.resultat}
					<button class="btn siffle" onclick={continuer}>
						{etat.index < etat.questions.length - 1 ? 'Question suivante' : 'Voir le bilan'}
					</button>
				{:else}
					<button class="btn" disabled={!etat.choix || etat.envoi === 'en_cours'} onclick={valider}>
						{etat.envoi === 'en_cours' ? 'Enregistrement…' : etat.envoi === 'erreur' ? 'Réessayer' : 'Valider ma réponse'}
					</button>
					{#if etat.envoi === 'erreur'}
						<p class="message-erreur" role="alert">Votre réponse n’a pas pu être enregistrée. Vérifiez votre connexion puis réessayez.</p>
					{:else if !etat.choix}
						<span class="aide">Choisissez une réponse, puis validez.</span>
					{/if}
				{/if}
			</div>
		</section>
		<Filet />
		<aside class="decision" bind:this={panneau} tabindex="-1" aria-live="polite" aria-label="Décision">
			<PanneauDecision resultat={etat.resultat} decision={bonne?.texte ?? ''} />
		</aside>
	</div>
{/if}

<style>
	.etat {
		margin: 40px;
	}
	.jeu {
		display: flex;
		flex-wrap: wrap;
		min-height: calc(100vh - 140px);
	}
	.situation {
		flex: 999 1 560px;
		min-width: 0;
		padding: 32px 44px 40px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
	.mode {
		font-size: 13px;
		font-weight: 600;
		color: var(--doux);
	}
	h1 {
		margin: 0;
		font-size: 27px;
		line-height: 1.38;
		font-weight: 600;
		max-width: 31em;
		text-wrap: balance;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-width: 46em;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
	}
	.aide {
		font-size: 14px;
		color: var(--doux);
	}
	.decision {
		flex: 1 1 420px;
		max-width: 560px;
		min-width: 0;
		background: var(--papier);
		padding: 32px 40px 40px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.decision:focus {
		outline: none;
	}
	.fin {
		max-width: 760px;
		margin: 0 auto;
		padding: 40px 20px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.fin h1 {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 34px;
	}
	.score {
		margin: 0;
		font-size: 20px;
	}
	.score .chiffres {
		font-weight: 800;
		font-size: 34px;
	}
	.fin ul {
		margin: 0;
		padding-left: 20px;
		line-height: 1.6;
	}
	@media (max-width: 700px) {
		.situation,
		.decision {
			padding: 24px 20px;
		}
	}
</style>
