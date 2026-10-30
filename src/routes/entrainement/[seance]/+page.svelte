<script lang="ts">
	import MessageErreur from '#lib/components/MessageErreur.svelte';
	import { pluriel } from '#lib/domain/texte.ts';
	import { iconeTheme } from '#lib/domain/icone-theme.ts';
	import '#lib/components/formulaire.css';
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { actionTouche, estBalayageGauche } from '#lib/seance/raccourcis.ts';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	import Etiquette from '#lib/components/Etiquette.svelte';
	import Filet from '#lib/components/Filet.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import PanneauDecision from '#lib/components/PanneauDecision.svelte';
	import Reponse, { type EtatReponse } from '#lib/components/Reponse.svelte';
	import { urlRegle } from '#lib/data/regles.ts';
	import { questionsDeSeance, revoirErreurs, terminerSeance, validerReponse, type BilanSeance } from '#lib/data/seances.ts';
	import Icone from '#lib/components/Icone.svelte';
	import ProgressionVolets from '#lib/components/ProgressionVolets.svelte';
	import Volet from '#lib/components/Volet.svelte';
	import {
		JE_NE_SAIS_PAS,
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
	import { lecteurVideo } from '#lib/seance/affichage.ts';
	import { marquer, mesMarquees } from '#lib/data/marquees.ts';
	import { signalerProbleme } from '#lib/data/signalements.ts';
	import { enregistrerPreferences, lirePreferences } from '#lib/preferences.ts';

	const seanceId = page.params.seance ?? '';
	let etat = $state<EtatPedago | null>(null);
	let chargement = $state<'en_cours' | 'pret' | 'erreur'>('en_cours');
	let bilan = $state<BilanSeance | null>(null);
	let aRevoir = $state<{ question: string; source: SourceCitee | undefined }[]>([]);
	let panneau = $state<HTMLElement>();
	let boutonSuivante = $state<HTMLButtonElement>();
	// Verdict annoncé aux lecteurs d'écran (la correction complète reste lisible dans le panneau).
	let annonce = $state('');
	// Reprise d'une séance commencée : l'index de la première question non faite, pour le dire une fois.
	let repriseIndex = $state<number | null>(null);
	// Questions marquées « à revoir plus tard ».
	let marquees = $state(new Set<string>());
	let erreurMarque = $state('');
	// Minuteur facultatif : 30 secondes conseillées par question.
	let minuteur = $state(lirePreferences().minuteurQuestion);
	let secondes = $state(30);
	// Signalement d'un problème sur la question.
	let signalement = $state('');
	let signalementEtat = $state<'' | 'envoi' | 'envoye' | 'erreur'>('');

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
				if (premiere > 0) repriseIndex = premiere;
				chargement = 'pret';
				if (premiere === -1) terminer();
			})
			.catch(() => (chargement = 'erreur'));
		mesMarquees()
			.then((m) => (marquees = m))
			.catch(() => {});
	});

	// Le minuteur repart à chaque question et s'arrête à la correction (il ignore le simple choix d'une réponse).
	const indexCourant = $derived(etat?.index);
	const corrigee = $derived(!!etat?.resultat);
	const seanceFinie = $derived(!!etat?.terminee);
	$effect(() => {
		const index = indexCourant;
		const fin = corrigee || seanceFinie;
		secondes = 30;
		if (!minuteur || index === undefined || fin) return;
		const t = setInterval(() => {
			secondes = Math.max(0, secondes - 1);
			if (secondes === 0) clearInterval(t);
		}, 1000);
		return () => clearInterval(t);
	});
	function basculerMinuteur() {
		minuteur = !minuteur;
		enregistrerPreferences({ minuteurQuestion: minuteur });
	}

	async function basculerMarque() {
		if (!question) return;
		const id = question.question_id;
		const nouvelle = !marquees.has(id);
		erreurMarque = '';
		try {
			await marquer(id, nouvelle);
			const m = new Set(marquees);
			if (nouvelle) m.add(id);
			else m.delete(id);
			marquees = m;
		} catch {
			erreurMarque = 'Le marquage n’a pas pu être enregistré.';
		}
	}

	async function envoyerSignalement(e: SubmitEvent) {
		e.preventDefault();
		if (!question || !signalement.trim()) return;
		signalementEtat = 'envoi';
		try {
			await signalerProbleme(question.question_id, signalement);
			signalementEtat = 'envoye';
			signalement = '';
		} catch {
			signalementEtat = 'erreur';
		}
	}

	const question = $derived(etat ? etat.questions[etat.index] : null);
	const bonne = $derived(question && etat?.resultat ? question.propositions.find((p) => p.id === etat!.resultat!.bonne_proposition_id) : null);

	function etatReponse(id: string): EtatReponse {
		if (!etat?.resultat) return 'neutre';
		if (id === etat.resultat.bonne_proposition_id) return 'ok';
		if (id === etat.choix) return 'ko';
		return 'ecartee';
	}

	// Connexion lente : un petit « Réponse enregistrée » confirme que l'envoi a abouti.
	let confirmationLente = $state(false);

	async function valider() {
		if (!etat || !question) return;
		const debutEnvoi = performance.now();
		const avant = etat;
		etat = debutValidation(etat);
		if (etat === avant) return; // pas de choix, déjà corrigé ou envoi en cours
		try {
			const proposition = etat.choix === JE_NE_SAIS_PAS ? null : etat.choix;
			const r = (await validerReponse(seanceId, question.question_id, proposition)) as ResultatValidation;
			etat = finValidation(etat, r);
			if (performance.now() - debutEnvoi > 800) {
				confirmationLente = true;
				setTimeout(() => (confirmationLente = false), 3000);
			}
			if (!r.correcte) aRevoir.push({ question: question.enonce, source: r.sources.find((s) => s.principale) ?? r.sources[0] });
			const juste = question.propositions.find((p) => p.id === r.bonne_proposition_id);
			annonce = r.correcte
				? 'Bonne réponse.'
				: r.sans_reponse
					? `Vous n’avez pas répondu. La bonne réponse est ${juste?.lettre ?? ''} : ${juste?.texte ?? ''}.`
					: `Réponse fausse. La bonne réponse est ${juste?.lettre ?? ''} : ${juste?.texte ?? ''}.`;
			// Sur écran étroit, la décision est sous la question : on y amène le focus. Sinon, sur « Question suivante ».
			await tick();
			if (window.innerWidth < 1000) panneau?.focus();
			else boutonSuivante?.focus();
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

	const erreurs = $derived(bilan ? bilan.total - bilan.score : 0);
	const chiffres = (n: number) => String(n).padStart(2, '0').split('');
	let relance = $state<'' | 'en_cours' | 'erreur'>('');

	async function revoir() {
		relance = 'en_cours';
		try {
			const id = await revoirErreurs(seanceId);
			// Rechargement complet : la page de séance lit son identifiant au démarrage.
			window.location.assign(`/entrainement/${id}`);
		} catch {
			relance = 'erreur';
		}
	}

	// Téléphone : après la correction, un balayage vers la gauche passe à la question suivante.
	let depart: { x: number; y: number } | null = null;
	const toucher = (e: TouchEvent) => (depart = { x: e.touches[0].clientX, y: e.touches[0].clientY });
	function lacher(e: TouchEvent) {
		if (!depart || !etat?.resultat) return;
		const t = e.changedTouches[0];
		if (estBalayageGauche(t.clientX - depart.x, t.clientY - depart.y)) continuer();
		depart = null;
	}
	// Le geste double le bouton « Question suivante » : écouteurs passifs, sans rôle à donner à la zone.
	let zoneJeu = $state<HTMLElement>();
	$effect(() => {
		const z = zoneJeu;
		if (!z) return;
		z.addEventListener('touchstart', toucher, { passive: true });
		z.addEventListener('touchend', lacher, { passive: true });
		return () => {
			z.removeEventListener('touchstart', toucher);
			z.removeEventListener('touchend', lacher);
		};
	});

	async function continuer() {
		if (!etat) return;
		annonce = '';
		repriseIndex = null;
		signalementEtat = '';
		etat = suivante(etat);
		if (etat.terminee) return terminer();
		// Nouvelle question : le lecteur d'écran l'entend, le focus et l'écran reviennent sur l'énoncé.
		annonce = `Question ${etat.index + 1} sur ${etat.questions.length}`;
		await tick();
		const enonce = document.getElementById('enonce');
		enonce?.focus();
		if (window.innerWidth < 1000) enonce?.scrollIntoView?.({ block: 'start' });
	}

	// Raccourcis à une touche : désactivables (WCAG 2.1.4), choix mémorisé dans ce navigateur.
	const lireRaccourcis = () => {
		try {
			return localStorage.getItem('raccourcis-seance') !== 'non';
		} catch {
			return true;
		}
	};
	let raccourcisActifs = $state(lireRaccourcis());
	function basculerRaccourcis() {
		raccourcisActifs = !raccourcisActifs;
		try {
			localStorage.setItem('raccourcis-seance', raccourcisActifs ? 'oui' : 'non');
		} catch {
			/* stockage indisponible : le choix vaut pour cette page */
		}
	}

	function clavier(e: KeyboardEvent) {
		if (!raccourcisActifs || !etat || !question || etat.terminee || e.ctrlKey || e.metaKey || e.altKey) return;
		const cible = e.target as HTMLElement;
		if (cible.closest('textarea, select, input:not([type="radio"])')) return;
		// Entrée sur un bouton ou un lien garde son comportement normal.
		if (e.key === 'Enter' && cible.closest('button, a')) return;
		const action = actionTouche(e.key, {
			nbPropositions: question.propositions.length,
			corrigee: !!etat.resultat,
			choix: !!etat.choix
		});
		if (!action) return;
		e.preventDefault();
		if (action.type === 'choisir') {
			const id = question.propositions[action.index].id;
			etat = choisir(etat, id);
			// Le focus suit le choix : le lecteur d'écran annonce la proposition sélectionnée.
			document.querySelector<HTMLInputElement>(`input[type="radio"][value="${id}"]`)?.focus();
		}
		else if (action.type === 'valider') valider();
		else continuer();
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
		etat ? `Question ${etat.index + 1}/${etat.questions.length} · ${pluriel(etat.acquises, 'acquise')} · ${etat.aRevoir} à revoir` : ''
	);
</script>

<svelte:head><title>{etat?.terminee ? 'Séance terminée' : etat ? `Question ${etat.index + 1}/${etat.questions.length}${question?.theme ? ` · ${question.theme}` : ''}` : 'Séance'} · Arbitrage volley</title></svelte:head>

<svelte:window onkeydown={clavier} />

<Bandeau titre="Arbitrage volley" sousTitre="Mode pédagogique" {compteurs} resumeTexte={resume}>
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>
{#if etat && !etat.terminee}
	<div class="progression" aria-hidden="true"><span style="width: {((etat.index + (etat.resultat ? 1 : 0)) / etat.questions.length) * 100}%"></span></div>
{/if}

{#if chargement === 'en_cours'}
	<div class="etat"><Chargement lignes={5} /></div>
{:else if chargement === 'erreur'}
	<MessageErreur texte="La séance n’a pas pu être chargée." classe="etat" />
{:else if etat?.terminee}
	<div class="bande-filet" aria-hidden="true"></div>
	<section class="score-fin">
		<h1><span class="surtitre">Mode pédagogique</span>Séance terminée</h1>
		{#if bilan}
			<div class="volets" role="img" aria-label="Score : {bilan.score} sur {bilan.total}">
				{#each chiffres(bilan.score) as c, i (i)}<Volet chiffre={c} taille="grand" />{/each}
				<span class="sur">/</span>
				{#each chiffres(bilan.total) as c, i (i)}<Volet chiffre={c} taille="grand" total />{/each}
			</div>
			<p class="detail">{pluriel(bilan.score, 'bonne réponse', 'bonnes réponses')} · {pluriel(erreurs, 'erreur')}</p>
		{/if}
	</section>
	<main class="fin">
		<div class="actions">
			{#if erreurs > 0}
				<button class="btn" onclick={revoir} disabled={relance === 'en_cours'}>
					{relance === 'en_cours' ? 'Préparation…' : `Revoir ${erreurs > 1 ? `mes ${erreurs} erreurs` : 'mon erreur'}`}
				</button>
			{/if}
			<a class={erreurs > 0 ? 'btn2' : 'btn'} href="/entrainement/nouvelle">Nouvelle séance</a>
			<a href="/">Retour à l’accueil</a>
		</div>
		{#if relance === 'erreur'}<p class="message-erreur" role="alert">La séance de révision n’a pas pu être créée. Vérifiez votre connexion puis réessayez.</p>{/if}

		{#if bilan && bilan.par_theme.length}
			<h2>Par thème</h2>
			<ul class="themes">
				{#each bilan.par_theme as t (t.theme_id ?? t.theme)}
					<li>
						<span class="theme"><Icone nom={iconeTheme(t.theme)} />{t.theme}</span>
						<span class="chiffres">{t.justes} / {t.total}</span>
						<ProgressionVolets acquises={t.justes} aRevoir={t.total - t.justes} total={t.total} />
					</li>
				{/each}
			</ul>
		{/if}

		{#if aRevoir.length}
			<h2>Les questions ratées</h2>
			<ul class="ratees">
				{#each aRevoir as r, i (i)}
					<li>
						{#if r.source}<a class="plaque" href={urlRegle(r.source)}>{r.source.reference}</a>{/if}
						<span>{r.question}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</main>
{:else if etat && question}
	<div class="jeu" bind:this={zoneJeu}>
		<section class="situation">
			<div class="meta">
				<Etiquette>{question.theme}</Etiquette>
				<Etiquette>{question.niveau}</Etiquette>
				<span class="mode">Mode pédagogique</span>
				<button type="button" class="marque" class:marquee={marquees.has(question.question_id)} onclick={basculerMarque} aria-pressed={marquees.has(question.question_id)}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill={marquees.has(question.question_id) ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"></path></svg>
					{marquees.has(question.question_id) ? 'Marquée pour plus tard' : 'Marquer pour plus tard'}
				</button>
				{#if erreurMarque}<span class="message-erreur" role="alert">{erreurMarque}</span>{/if}
				<a class="quitter" href="/">Quitter la séance <span class="aide-quitter">(vous la reprendrez depuis l’accueil)</span></a>
			</div>
			{#if repriseIndex !== null && etat.index === repriseIndex}
				<p class="reprise" role="status">Vous reprenez à la question {repriseIndex + 1} sur {etat.questions.length}.</p>
			{/if}
			{#key etat.index}
			<div class="question-bloc">
			<h1 id="enonce" tabindex="-1">{question.enonce}</h1>
			{#if question.video_url}
				{@const video = lecteurVideo(question.video_url)}
				{#if video?.type === 'youtube'}
					<div class="video"><iframe src={video.src} title="Vidéo de la situation" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>
				{:else if video?.type === 'fichier'}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video class="video-fichier" src={video.src} controls preload="metadata"></video>
				{:else if video}
					<p><a href={video.src} target="_blank" rel="noopener">Voir la vidéo de la situation (nouvel onglet)</a></p>
				{/if}
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
				<label class="jnsp" class:sel={etat.choix === JE_NE_SAIS_PAS} class:corrigee={!!etat.resultat}>
					<input type="radio" name="reponse-{question.question_id}" value={JE_NE_SAIS_PAS} checked={etat.choix === JE_NE_SAIS_PAS} disabled={!!etat.resultat || etat.envoi === 'en_cours'} onchange={() => (etat = choisir(etat!, JE_NE_SAIS_PAS))} />
					<span>Je ne sais pas</span>
					<span class="aide">compte comme une erreur, mais sans deviner</span>
				</label>
			</fieldset>
			</div>
			{/key}
			<div class="actions">
				{#if etat.resultat}
					<button class="btn siffle" bind:this={boutonSuivante} onclick={continuer}>
						{etat.index < etat.questions.length - 1 ? 'Question suivante' : 'Voir le bilan'}
					</button>
					<span class="aide balayage">ou balayez vers la gauche</span>
					{#if confirmationLente}<span class="aide confirmation" role="status">Réponse enregistrée</span>{/if}
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
			<p class="raccourcis">
				{#if raccourcisActifs}Au clavier : <kbd>A</kbd> à <kbd>D</kbd> pour choisir, <kbd>Entrée</kbd> pour valider, <kbd>S</kbd> pour la question suivante.{:else}Raccourcis clavier désactivés.{/if}
				<button type="button" class="lien-raccourcis" onclick={basculerRaccourcis}>{raccourcisActifs ? 'Désactiver' : 'Activer'}</button>
			</p>
			<p class="minuteur" class:depasse={minuteur && secondes === 0 && !etat.resultat}>
				{#if minuteur}
					<Icone nom="chrono" taille={16} />
					{#if etat.resultat}Minuteur arrêté.{:else if secondes > 0}<span class="chiffres">{secondes} s</span> conseillées pour décider.{:else}Temps conseillé dépassé : décidez, comme en match.{/if}
				{:else}
					Minuteur de 30 s par question désactivé.
				{/if}
				<button type="button" class="lien-raccourcis" onclick={basculerMinuteur}>{minuteur ? 'Désactiver' : 'Activer'}</button>
			</p>
			<p class="vh" role="status">{annonce}</p>
		</section>
		<Filet />
		<aside class="decision" bind:this={panneau} tabindex="-1" aria-label="Décision">
			{#key etat.resultat}
			<div class="decision-bloc">
			<PanneauDecision resultat={etat.resultat} decision={bonne?.texte ?? ''} lettre={bonne?.lettre ?? ''} propositions={question.propositions} choix={etat.choix} />
			{#if etat.resultat}
				<details class="signaler">
					<summary>Un souci avec cette question ?</summary>
					{#if signalementEtat === 'envoye'}
						<p class="message-info" role="status">Merci, votre formateur a été prévenu.</p>
					{:else}
						<form onsubmit={envoyerSignalement}>
							<label class="champ">Décrivez le problème (énoncé ambigu, réponse contestable, règle inexacte…)
								<textarea rows="3" bind:value={signalement} maxlength="1000" required></textarea>
							</label>
							{#if signalementEtat === 'erreur'}<p class="message-erreur" role="alert">Le signalement n’a pas pu être envoyé. Réessayez.</p>{/if}
							<button class="btn2" type="submit" disabled={signalementEtat === 'envoi' || !signalement.trim()}>{signalementEtat === 'envoi' ? 'Envoi…' : 'Prévenir le formateur'}</button>
						</form>
					{/if}
				</details>
				<!-- Sur écran étroit, la décision est sous la question : la suite est répétée ici, à portée de main. -->
				<button class="btn suite-decision" onclick={continuer}>
					{etat.index < etat.questions.length - 1 ? 'Question suivante' : 'Voir le bilan'}
				</button>
			{/if}
			</div>
			{/key}
		</aside>
	</div>
{/if}

<style>
	.etat {
		margin: 40px;
	}
	/* Barre de progression fine sous le bandeau. */
	.progression {
		height: 4px;
		background: var(--filet-doux);
	}
	.progression span {
		display: block;
		height: 100%;
		background: var(--tableau);
		transition: width var(--duree-volet) var(--courbe-volet);
	}
	.marque {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		padding: 5px 10px;
		border: 1px solid var(--filet);
		border-radius: var(--r-petit);
		background: var(--papier);
		color: var(--doux);
		cursor: pointer;
		min-height: 44px;
	}
	.marque.marquee {
		color: var(--ambre);
		border-color: var(--ambre-vif);
		background: var(--ambre-clair);
	}
	.reprise {
		margin: 0;
		padding: 10px 14px;
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		font-size: 14px;
		font-weight: 600;
	}
	.video {
		position: relative;
		max-width: 46em;
		aspect-ratio: 16 / 9;
		background: var(--tableau);
		border-radius: var(--r);
		overflow: hidden;
	}
	.video iframe {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
	}
	.video-fichier {
		max-width: 46em;
		width: 100%;
		border-radius: var(--r);
		background: var(--tableau);
	}
	.jnsp {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		column-gap: 10px;
		padding: 10px 16px;
		border: 1.5px dashed var(--filet);
		border-radius: var(--r);
		color: var(--doux);
		font-size: 15px;
		cursor: pointer;
	}
	.jnsp input {
		margin: 0;
		accent-color: var(--trait);
	}
	.jnsp .aide {
		grid-column: 2;
		font-size: 13px;
	}
	.jnsp.sel {
		border-style: solid;
		border-color: var(--encre);
		color: var(--encre);
	}
	.balayage {
		display: none;
	}
	#enonce:focus {
		outline: none;
	}
	.suite-decision {
		display: none;
		align-self: flex-start;
	}
	@media (max-width: 999px) {
		.suite-decision {
			display: inline-block;
		}
	}
	.confirmation {
		font-weight: 600;
		color: var(--bleu-texte);
	}
	@media (pointer: coarse) {
		.balayage {
			display: inline;
		}
	}
	.jnsp.corrigee {
		cursor: default;
	}
	.minuteur {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: var(--doux);
	}
	.minuteur .chiffres {
		font-weight: 800;
		font-size: 15px;
		color: var(--encre);
	}
	.minuteur.depasse {
		color: var(--ambre);
	}
	/* Transition entre questions : l'énoncé suivant glisse, la décision se fond. */
	.question-bloc {
		display: flex;
		flex-direction: column;
		gap: 20px;
		animation: glisser var(--duree-micro) ease-out;
	}
	.decision-bloc {
		display: flex;
		flex-direction: column;
		gap: 18px;
		animation: fondu var(--duree-micro) ease-out;
	}
	@keyframes glisser {
		from {
			opacity: 0;
			transform: translateX(24px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	@keyframes fondu {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	.signaler {
		margin-top: auto;
		font-size: 14px;
	}
	.signaler summary {
		cursor: pointer;
		color: var(--doux);
		font-weight: 600;
	}
	.signaler form {
		margin-top: 10px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	@media (prefers-reduced-motion: reduce) {
		.question-bloc,
		.decision-bloc {
			animation: none;
		}
		.progression span {
			transition: none;
		}
	}
	/* Sur grand écran, la page reste groupée : la décision se lit à côté des réponses. */
	.jeu {
		display: flex;
		flex-wrap: wrap;
		min-height: calc(100vh - 140px);
		max-width: 1360px;
		margin: 0 auto;
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
	.quitter {
		margin-left: auto;
		font-size: 14px;
		font-weight: 600;
		color: var(--doux);
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.quitter:hover {
		color: var(--encre);
	}
	.aide-quitter {
		font-weight: 400;
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
	.raccourcis {
		margin: 0;
		font-size: 13px;
		color: var(--doux);
	}
	.lien-raccourcis {
		margin-left: 6px;
		font: inherit;
		background: none;
		border: 0;
		padding: 0;
		color: var(--bleu-texte);
		text-decoration: underline;
		cursor: pointer;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	kbd {
		font-family: var(--police-chiffres);
		font-weight: 600;
		font-size: 12px;
		padding: 1px 6px;
		border: 1px solid var(--filet);
		border-bottom-width: 2px;
		border-radius: var(--r-petit);
		background: var(--papier);
		color: var(--encre);
	}
	/* Pas de clavier physique sur les écrans tactiles : on n'affiche pas l'aide. */
	@media (hover: none) {
		.raccourcis {
			display: none;
		}
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
	/* Fin de séance : le score s'affiche sur le tableau de marque, comme une fin de set. */
	.score-fin {
		background: var(--tableau);
		color: var(--sur-fonce);
		/* Même colonne que le contenu dessous (860 px centrés). */
		padding: 28px max(20px, calc((100% - 860px) / 2 + 20px)) 32px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px 40px;
	}
	.score-fin h1 {
		flex-basis: 100%;
		margin: 0;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 34px;
		line-height: 1.05;
		max-width: none;
	}
	.score-fin .surtitre {
		color: var(--tableau-texte-doux);
	}
	.volets {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.sur {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 44px;
		color: var(--tableau-texte-doux);
		padding: 0 10px;
	}
	.detail {
		margin: 0;
		font-size: 17px;
		font-weight: 600;
		color: var(--tableau-texte);
	}
	.fin {
		max-width: 860px;
		margin: 0 auto;
		padding: 32px 20px 48px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.fin h2 {
		margin: 12px 0 0;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 24px;
	}
	.themes,
	.ratees {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.themes li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 70px minmax(150px, 260px);
		align-items: center;
		gap: 16px;
		padding: 12px 16px;
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
	}
	.theme {
		display: flex;
		align-items: center;
		gap: 10px;
		font-weight: 600;
	}
	.themes .chiffres {
		font-weight: 800;
		font-size: 18px;
	}
	.ratees li {
		display: flex;
		align-items: baseline;
		gap: 12px;
		line-height: 1.5;
	}
	.ratees .plaque {
		flex: none;
	}
	@media (max-width: 600px) {
		.score-fin {
			padding: 24px 20px;
		}
		.themes li {
			grid-template-columns: minmax(0, 1fr) auto;
		}
		.themes li :global(.volets) {
			grid-column: 1 / -1;
		}
	}
	@media (max-width: 700px) {
		.situation,
		.decision {
			padding: 24px 20px;
		}
	}
</style>
