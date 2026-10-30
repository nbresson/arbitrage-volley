<script lang="ts" module>
	/** Une question d'examen, telle que l'écran la manipule (entraînement : valeur = id de proposition ; officiel : lettre). */
	export type QuestionPassation = {
		questionId: string;
		theme: string;
		enonce: string;
		propositions: { valeur: string; lettre: string; texte: string }[];
		choisie: string | null;
		signalee: boolean;
	};

	/** Ce que l'écran d'examen attend de la base : examen d'entraînement ou tentative d'examen officiel. */
	export type SourcePassation = {
		cleFile: string;
		titre: string;
		sousTitre: string;
		urlResultat: string;
		/** `maintenant` : l'heure du serveur, si la source la connaît (examen officiel). */
		charger(): Promise<{ debut: string; dureeMinutes: number; fin: string | null; maintenant?: string; questions: QuestionPassation[] }>;
		/** Lève ErreurServeur quand le serveur refuse (réessayer ne changerait rien). */
		repondre(questionId: string, valeur: string, reponduLe: string): Promise<void>;
		signaler(questionId: string, signalee: boolean): Promise<void>;
		terminer(): Promise<void>;
		/** Examen officiel : enregistre une sortie de l'écran (onglet ou application quittés). */
		noterSortie?(): Promise<void>;
	};
</script>

<script lang="ts">
	import MessageErreur from '#lib/components/MessageErreur.svelte';
	import '#lib/components/formulaire.css';
	import { goto } from '$app/navigation';
	import Compteur from '#lib/components/Compteur.svelte';
	import DialogueConfirmation from '#lib/components/DialogueConfirmation.svelte';
	import Etiquette from '#lib/components/Etiquette.svelte';
	import Filet from '#lib/components/Filet.svelte';
	import GrilleQuestions from '#lib/components/GrilleQuestions.svelte';
	import Reponse from '#lib/components/Reponse.svelte';
	import { ErreurServeur } from '#lib/data/seances.ts';
	import { texteEnAttente, texteRetablie } from '#lib/examen-officiel/salle.ts';
	import { prochaineSansReponse, tempsRestant, texteConfirmation } from '#lib/seance/examen.ts';
	import { creerFile, RefusDefinitif } from '#lib/seance/file-hors-ligne.ts';
	import { SvelteSet } from 'svelte/reactivity';

	let { source }: { source: SourcePassation } = $props();

	// La source ne change pas pendant la vie de l'écran (une page = un examen).
	// svelte-ignore state_referenced_locally
	const cleFile = source.cleFile;
	const file = creerFile(localStorage, cleFile);

	let info = $state<{ debut: string; dureeMinutes: number } | null>(null);
	let questions = $state<QuestionPassation[]>([]);
	let chargement = $state<'en_cours' | 'pret' | 'erreur'>('en_cours');
	let courant = $state(1);
	let choix = $state<Record<string, string>>({});
	// Dernière valeur confiée à la file pour chaque question : une réponse cochée qui en diffère n'est pas encore enregistrée.
	const confiees: Record<string, string> = {};
	// Fin du temps : envoi des réponses en cours, en attente du réseau, ou échec de la clôture.
	let finTemps = $state<'' | 'envoi' | 'attente'>('');
	let occupe = $state(false);
	const repondues = new SvelteSet<number>();
	const signalees = new SvelteSet<number>();
	let enLigne = $state(navigator.onLine);
	let enregistrement = $state<'' | 'en_cours' | 'enregistree' | 'locale'>('');
	let maintenant = $state(new Date());
	let confirmation = $state(false);
	let erreurFin = $state('');
	// Heure à laquelle chaque proposition a été cochée : c'est elle qui part au serveur, pas l'heure de l'envoi.
	const cocheeLe: Record<string, Date> = {};
	let refus = $state('');
	let fini = false;
	// Réponses gardées sur l'appareil en attendant le réseau ; « Tout est envoyé » une fois la file vidée.
	let enAttente = $state(0);
	let toutEnvoye = $state(false);
	let retablie = $state('');
	let sortie = $state(false);
	// Écart entre l'horloge du serveur et celle de l'appareil : le temps qui compte est celui du serveur.
	let decalage = 0;
	const heure = () => new Date(Date.now() + decalage);

	/** L'examen est terminé côté serveur (clos par le formateur, ou déjà fini) : départ vers le résultat. */
	function versResultat() {
		fini = true;
		localStorage.removeItem(cleFile);
		goto(source.urlResultat, { replaceState: true });
	}

	/** Questions répondues : ce que le serveur a enregistré, plus les réponses encore en attente sur l'appareil. */
	function marquerRepondues(qs: QuestionPassation[]) {
		repondues.clear();
		qs.forEach((q, k) => q.choisie && repondues.add(k + 1));
		for (const r of file.lister()) {
			const k = qs.findIndex((q) => q.questionId === r.questionId);
			if (k >= 0) repondues.add(k + 1);
		}
	}

	$effect(() => {
		source
			.charger()
			.then((d) => {
				if (d.fin) return versResultat();
				if (d.maintenant) decalage = new Date(d.maintenant).getTime() - Date.now();
				maintenant = heure();
				info = { debut: d.debut, dureeMinutes: d.dureeMinutes };
				questions = d.questions;
				d.questions.forEach((q, k) => {
					if (q.choisie) (choix[q.questionId] = q.choisie), (confiees[q.questionId] = q.choisie);
					if (q.signalee) signalees.add(k + 1);
				});
				// Réponses gardées hors ligne lors d'une visite précédente.
				for (const r of file.lister()) {
					if (d.questions.some((q) => q.questionId === r.questionId)) (choix[r.questionId] = r.propositionId), (confiees[r.questionId] = r.propositionId);
				}
				marquerRepondues(d.questions);
				courant = prochaineSansReponse(repondues, 0, d.questions.length) ?? 1;
				chargement = 'pret';
				envoyerFile();
			})
			.catch(() => (chargement = 'erreur'));

		const tic = setInterval(() => (maintenant = heure()), 1000);
		const enLigneOn = async () => {
			enLigne = true;
			if (finTemps === 'attente') return void finirAuTemps();
			const avant = file.lister().length;
			const b = await envoyerFile();
			retablie = texteRetablie(Math.min(avant, b.envoyees));
			setTimeout(() => (retablie = ''), 6000);
		};
		// Examen officiel : quitter l'écran est enregistré, et signalé au retour.
		const visibilite = () => {
			if (!source.noterSortie || fini || chargement !== 'pret') return;
			if (document.visibilityState === 'hidden') {
				sortie = true;
				source.noterSortie().catch(() => {});
			}
		};
		const avantFermeture = (e: BeforeUnloadEvent) => {
			if (source.noterSortie && !fini && chargement === 'pret') e.preventDefault();
		};
		document.addEventListener('visibilitychange', visibilite);
		addEventListener('beforeunload', avantFermeture);
		const horsLigne = () => (enLigne = false);
		addEventListener('online', enLigneOn);
		addEventListener('offline', horsLigne);
		return () => {
			clearInterval(tic);
			clearTimeout(relance);
			removeEventListener('online', enLigneOn);
			removeEventListener('offline', horsLigne);
			document.removeEventListener('visibilitychange', visibilite);
			removeEventListener('beforeunload', avantFermeture);
		};
	});

	const question = $derived(questions[courant - 1]);
	const temps = $derived(info?.dureeMinutes ? tempsRestant(new Date(info.debut), info.dureeMinutes, maintenant) : null);
	const sansReponse = $derived(questions.length - repondues.size);
	const textes = $derived(texteConfirmation(sansReponse, signalees.size));
	const deux = (n: number) => String(n).padStart(2, '0');

	// Fin du temps : une seule séquence (pas une relance chaque seconde), qui n'achève jamais la tentative
	// tant que des réponses attendent sur l'appareil.
	$effect(() => {
		if (temps?.ecoule && !fini && !finTemps && !occupe && chargement === 'pret') finirAuTemps();
	});

	let relance: ReturnType<typeof setTimeout> | undefined;
	async function finirAuTemps() {
		clearTimeout(relance);
		// Un dialogue resté ouvert masquerait l'écran « Temps écoulé ».
		confirmation = false;
		erreurFin = '';
		finTemps = 'envoi';
		await enregistrerCourante();
		const bilan = await envoyerFile();
		if (bilan.restantes) return attendreReseau();
		try {
			fini = true;
			await source.terminer();
			localStorage.removeItem(cleFile);
			goto(`${source.urlResultat}?fin=auto&n=${repondues.size}`);
		} catch {
			fini = false;
			attendreReseau();
		}
	}
	function attendreReseau() {
		finTemps = 'attente';
		relance = setTimeout(finirAuTemps, 5000);
	}

	/** Met la réponse cochée de la question courante dans la file si elle n'y est pas déjà (sans attendre le réseau). */
	function confierCourante(): boolean {
		if (!question) return false;
		const valeur = choix[question.questionId];
		if (!valeur || confiees[question.questionId] === valeur) return false;
		// Datée du moment où elle a été cochée, et jamais après la fin : le serveur refuse les réponses postérieures.
		let le = cocheeLe[question.questionId] ?? heure();
		if (info?.dureeMinutes) le = new Date(Math.min(le.getTime(), new Date(info.debut).getTime() + info.dureeMinutes * 60_000));
		file.ajouter({ seanceId: cleFile, questionId: question.questionId, propositionId: valeur, reponduLe: le.toISOString() });
		confiees[question.questionId] = valeur;
		repondues.add(courant);
		toutEnvoye = false;
		return true;
	}

	/** Confie la réponse courante, puis l'envoie. */
	async function enregistrerCourante() {
		if (!confierCourante()) return;
		enregistrement = 'en_cours';
		const bilan = await envoyerFile();
		enregistrement = bilan.restantes ? 'locale' : 'enregistree';
	}

	// Changer de question ne bloque jamais sur le réseau : la réponse est confiée à la file, l'envoi suit en arrière-plan.
	function aller(n: number) {
		const confiee = confierCourante();
		courant = n;
		enregistrement = '';
		if (confiee) envoyerFile();
	}

	async function envoyerFile() {
		const bilan = await file.vider(async (r) => {
			try {
				await source.repondre(r.questionId, r.propositionId, r.reponduLe);
			} catch (e) {
				// Refus du serveur : réessayer ne changerait rien, la réponse est retirée de la file.
				throw e instanceof ErreurServeur ? new RefusDefinitif(e.message) : e;
			}
		});
		if (bilan.refusees) {
			const horloge = /temps/i.test(bilan.messageRefus ?? '') ? ' Si l’heure de votre appareil est fausse, corrigez-la.' : '';
			refus = `${bilan.refusees} réponse(s) refusée(s) par le serveur : ${bilan.messageRefus}${horloge}`;
			// Resynchronise l'affichage avec ce que le serveur a réellement enregistré.
			const d = await source.charger().catch(() => null);
			if (d?.fin) versResultat();
			else if (d) marquerRepondues(d.questions);
		}
		if (bilan.envoyees && !bilan.restantes && enregistrement === 'locale') enregistrement = 'enregistree';
		if (enAttente > 0 && !bilan.restantes) toutEnvoye = true;
		enAttente = bilan.restantes;
		return bilan;
	}

	async function valider() {
		if (!question || !choix[question.questionId]) return;
		await enregistrerCourante();
		repondues.add(courant);
		const suite = prochaineSansReponse(repondues, courant, questions.length);
		if (suite === null) confirmation = true;
		else courant = suite;
	}

	async function basculerSignalement() {
		if (!question) return;
		const n = courant, actif = !signalees.has(n);
		actif ? signalees.add(n) : signalees.delete(n);
		try {
			await source.signaler(question.questionId, actif);
		} catch {
			/* le signalement est un aide-mémoire : on garde l'état local */
		}
	}

	async function terminer() {
		if (occupe) return;
		occupe = true;
		fini = true;
		erreurFin = '';
		await enregistrerCourante();
		const bilan = await envoyerFile();
		if (bilan.restantes) {
			fini = false;
			occupe = false;
			erreurFin = `${bilan.restantes} réponse(s) n’ont pas encore pu être envoyées. Vérifiez votre connexion puis réessayez.`;
			return;
		}
		try {
			await source.terminer();
			localStorage.removeItem(cleFile);
			goto(source.urlResultat);
		} catch {
			fini = false;
			occupe = false;
			erreurFin = 'L’examen n’a pas pu être terminé. Vérifiez votre connexion puis réessayez.';
		}
	}
</script>

<header class="bandeau">
	<div class="marque">{source.titre}<span>{source.sousTitre}</span></div>
	{#if info && questions.length}
		<div class="compteurs" role="group" aria-label="Question {courant} sur {questions.length}, {repondues.size} répondues{temps ? `, ${temps.minutes} minutes ${temps.secondes} restantes` : ''}">
			<Compteur valeur={courant} chiffres={2} libelle="Question / {questions.length}" />
			<Compteur valeur={repondues.size} chiffres={2} libelle="Répondues" />
			{#if temps}
				<div class="chrono" class:faible={temps.faible}>
					<Compteur valeur={temps.minutes} chiffres={2} libelle="Minutes" />
					<Compteur valeur={temps.secondes} chiffres={2} libelle="Secondes" />
				</div>
			{/if}
		</div>
		<span class="resume">Question {courant}/{questions.length} · {repondues.size} répondues{temps ? ` · ${deux(temps.minutes)}:${deux(temps.secondes)}` : ''}</span>
	{/if}
	<div class="droite">
		{#if chargement === 'pret' && questions.length && !temps?.ecoule}
			<button class="fin" onclick={async () => ((confirmation = true), await enregistrerCourante())}>Terminer l’examen</button>
		{/if}
	</div>
</header>

<!-- Région annoncée présente dès le départ : son texte ne change qu'à 5 minutes puis à 1 minute de la fin. -->
<div class="alerte-temps" class:visible={!!temps?.alerte} role="status">{temps?.alerte ? `${temps.alerte} Vos réponses enregistrées seront envoyées automatiquement à la fin du temps.` : ''}</div>

{#if !enLigne}
	<div class="hors-ligne" role="status">Hors ligne : vos réponses restent sur cet appareil et seront envoyées dès le retour de la connexion.{enAttente ? ` ${texteEnAttente(enAttente)}.` : ''}</div>
{:else if retablie}
	<div class="retablie" role="status">{retablie}</div>
{/if}
{#if sortie}
	<div class="hors-ligne" role="alert">
		Vous avez quitté l’écran de l’examen : votre sortie a été enregistrée et votre formateur la verra.
		<button type="button" class="fermer" onclick={() => (sortie = false)}>Compris</button>
	</div>
{/if}

{#if chargement === 'en_cours'}
	<p class="etat" role="status">Chargement de l’examen…</p>
{:else if chargement === 'erreur'}
	<MessageErreur texte="L’examen n’a pas pu être chargé." classe="etat" />
{:else if temps?.ecoule}
	<section class="temps-ecoule" role="status">
		<h1>Temps écoulé</h1>
		{#if finTemps === 'attente'}
			<p>Connexion perdue : vos réponses sont gardées sur cet appareil et partiront au retour du réseau. Ne fermez pas cette page.</p>
			{#if enAttente}<p class="aide">{texteEnAttente(enAttente)}.</p>{/if}
			<button type="button" class="btn" onclick={finirAuTemps}>Réessayer maintenant</button>
		{:else}
			<p>Envoi de vos réponses…</p>
		{/if}
	</section>
{:else if question}
	<div class="jeu">
		<section class="situation">
			<div class="meta"><Etiquette>{question.theme}</Etiquette><span class="aide">Question {courant} · une seule réponse possible</span></div>
			<h1 id="enonce">{question.enonce}</h1>
			<fieldset aria-describedby="enonce">
				<legend class="vh">Propositions de réponse</legend>
				{#each question.propositions as p (p.valeur)}
					<Reponse
						nom="examen-{question.questionId}"
						valeur={p.valeur}
						lettre={p.lettre}
						texte={p.texte}
						choisie={choix[question.questionId] === p.valeur}
						desactivee={!!temps?.ecoule}
						onchoisir={(v) => ((choix[question.questionId] = v), (cocheeLe[question.questionId] = heure()), (enregistrement = ''))}
					/>
				{/each}
			</fieldset>
			<div class="actions">
				<button class="btn" disabled={!choix[question.questionId] || enregistrement === 'en_cours'} onclick={valider}>Valider et continuer</button>
				<button class="btn2" class:on={signalees.has(courant)} aria-pressed={signalees.has(courant)} onclick={basculerSignalement}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4h11l-2 4 2 4H5" /></svg>
					{signalees.has(courant) ? 'Signalée à vérifier' : 'Signaler à vérifier'}
				</button>
				<span class="aide" role="status">
					{enAttente ? texteEnAttente(enAttente) : toutEnvoye ? 'Tout est envoyé' : enregistrement === 'enregistree' ? 'Réponse enregistrée' : enregistrement === 'locale' ? 'Réponse gardée sur cet appareil' : ''}
				</span>
			</div>
			{#if refus}<p class="message-erreur" role="alert">{refus}</p>{/if}
			<p class="aide">
				{source.noterSortie ? 'Restez sur cet écran : chaque sortie est enregistrée. ' : ''}Les corrections ne sont pas affichées pendant l’examen. À la fin du temps, vos réponses enregistrées sont envoyées automatiquement.
			</p>
		</section>
		<Filet />
		<aside class="cote">
			<h2>Vos réponses</h2>
			<GrilleQuestions total={questions.length} {courant} {repondues} {signalees} onaller={aller} />
			<p>Cliquez sur un numéro pour revenir à une question tant que l’examen n’est pas terminé. <b>{signalees.size}</b> signalée(s) à vérifier, <b>{sansReponse}</b> sans réponse.</p>
		</aside>
	</div>
{/if}

<DialogueConfirmation
	ouvert={confirmation}
	titre={textes.titre}
	texte={textes.texte}
	libelleAnnuler="Continuer l’examen"
	libelleConfirmer={sansReponse ? 'Terminer quand même' : 'Terminer et voir mon score'}
	erreur={erreurFin}
	onannuler={() => ((confirmation = false), (erreurFin = ''))}
	{occupe}
	onconfirmer={terminer}
/>

<style>
	.bandeau {
		background: var(--tableau);
		color: var(--sur-fonce);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px 32px;
		padding: 22px 40px;
		border-bottom: 6px solid var(--papier);
	}
	.bandeau :global(:focus-visible) {
		outline-color: var(--sur-fonce);
	}
	.marque {
		flex: 1 1 220px;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 26px;
		line-height: 1;
	}
	.marque span {
		display: block;
		font-family: var(--police);
		font-weight: 500;
		font-size: 13px;
		color: var(--tableau-texte-doux);
		margin-top: 6px;
	}
	.compteurs,
	.chrono {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
	}
	.chrono {
		gap: 8px;
	}
	.chrono.faible :global(.volet) {
		box-shadow: inset 0 -4px 0 var(--ambre-vif);
	}
	.resume {
		display: none;
		font-weight: 600;
	}
	.droite {
		flex: 1 1 220px;
		display: flex;
		justify-content: flex-end;
	}
	.fin {
		font: inherit;
		color: var(--sur-fonce);
		font-weight: 700;
		font-size: 15px;
		padding: 12px 16px;
		border: 1.5px solid var(--sur-fonce);
		border-radius: var(--r);
		background: transparent;
		cursor: pointer;
	}
	.fin:hover {
		background: var(--volet);
	}
	.hors-ligne {
		background: var(--ambre-clair);
		color: var(--ambre);
		border-bottom: 1px solid var(--ambre-vif);
		padding: 12px 40px;
		font-weight: 600;
	}
	.retablie {
		background: var(--bleu-clair);
		color: var(--bleu-texte);
		padding: 12px 40px;
		font-weight: 600;
	}
	.fermer {
		margin-left: 12px;
		font: inherit;
		font-weight: 700;
		color: inherit;
		background: none;
		border: 1.5px solid currentColor;
		border-radius: var(--r-petit);
		padding: 4px 10px;
		cursor: pointer;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.alerte-temps:not(.visible) {
		padding: 0 !important;
		border: 0;
	}
	.alerte-temps {
		background: var(--ambre-clair);
		color: var(--ambre);
		border-bottom: 1px solid var(--ambre-vif);
		padding: 12px 40px;
		font-weight: 700;
	}
	.etat {
		margin: 40px;
	}
	.temps-ecoule {
		max-width: 640px;
		margin: 48px auto;
		padding: 0 20px;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 14px;
	}
	.temps-ecoule h1 {
		margin: 0;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 34px;
	}
	.temps-ecoule p {
		margin: 0;
		font-size: 18px;
		line-height: 1.5;
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
	.meta,
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
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
	.aide {
		font-size: 14px;
		color: var(--doux);
		margin: 0;
	}
	.btn2.on {
		border-color: var(--ambre);
		color: var(--ambre);
		background: var(--ambre-clair);
	}
	.cote {
		flex: 1 1 420px;
		max-width: 560px;
		min-width: 0;
		background: var(--papier);
		padding: 32px 40px 40px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.cote h2 {
		margin: 0;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 26px;
	}
	.cote p {
		margin: 0;
		line-height: 1.6;
	}
	@media (max-width: 600px) {
		.compteurs {
			display: none;
		}
		.resume {
			display: block;
		}
	}
	@media (max-width: 700px) {
		.situation,
		.cote {
			padding: 24px 20px;
		}
		.bandeau {
			padding: 16px 20px;
		}
		.alerte-temps,
		.retablie,
		.hors-ligne {
			padding: 12px 20px;
		}
	}
</style>
