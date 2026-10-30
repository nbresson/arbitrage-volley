<script lang="ts">
	import MessageErreur from '#lib/components/MessageErreur.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	import '#lib/components/formulaire.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import FilAriane from '#lib/components/FilAriane.svelte';
	import DialogueConfirmation from '#lib/components/DialogueConfirmation.svelte';
	import NavFormateur from '#lib/components/NavFormateur.svelte';
	import Reponse from '#lib/components/Reponse.svelte';
	import {
		archiverQuestion,
		chargerQuestion,
		enregistrerQuestion,
		formulaireVide,
		historiqueQuestion,
		listerQuestions,
		type LigneQuestion,
		type Modification,
		type QuestionComplete,
		type RegleLiee
	} from '#lib/data/questions.ts';
	import { avertissementsQualite, doublons, fileRelecture, positionRelecture } from '#lib/formateur/banque.ts';
	import { toutesLesRegles } from '#lib/data/regles.ts';
	import { signalementsDeQuestion, traiterSignalement, type Signalement } from '#lib/data/signalements.ts';
	import { referentiel, type Option } from '#lib/data/seances.ts';
	import { validerFormulaire, type FormulaireQuestion } from '#lib/formateur/validation-question.ts';
	import { chercher, type Regle } from '#lib/regles/arbre.ts';

	// Identifiant courant : null pour une nouvelle question, puis celui renvoyé par le premier enregistrement.
	let id = $state<string | null>(page.params.id === 'nouvelle' ? null : (page.params.id ?? null));
	let question = $state<QuestionComplete | null>(null);
	let f = $state<FormulaireQuestion>(formulaireVide());
	let liees = $state<RegleLiee[]>([]);
	let themes = $state<Option[]>([]);
	let niveaux = $state<Option[]>([]);
	let regles = $state<Regle[]>([]);
	let rechercheRegle = $state('');
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	let erreurs = $state<Record<string, string>>({});
	let message = $state('');
	let erreurEnvoi = $state('');
	let envoi = $state(false);
	let confirmerArchive = $state(false);
	// Après la validation d'un brouillon : le brouillon suivant à relire, pour enchaîner sans repasser par la liste.
	let brouillonSuivant = $state<string | null>(null);
	let signalements = $state<Signalement[]>([]);
	// File de relecture (« Relire les brouillons ») : rang du brouillon et suivant.
	const relecture = page.url.searchParams.has('relecture');
	const depuis = page.url.searchParams.get('depuis');
	let toutes = $state<LigneQuestion[]>([]);
	let historique = $state<Modification[]>([]);
	let avertissements = $state<string[]>([]);
	let apercu = $state(false);
	let choixApercu = $state<string | null>(null);
	// Sauvegarde automatique sur l'appareil, proposée au retour si elle diffère de la version enregistrée.
	const cleSauvegarde = () => `edition-question-${id ?? 'nouvelle'}`;
	let sauvegarde = $state<{ quand: string; f: FormulaireQuestion; liees: RegleLiee[] } | null>(null);
	let sauvegardeActive = $state(false);

	const file = $derived(fileRelecture(toutes));
	const position = $derived(id ? positionRelecture(file, id) : null);
	const prochains = $derived(file.filter((x) => x !== id));
	const doublonsTrouves = $derived(f.enonce.trim().length > 20 ? doublons(f.enonce, toutes, id) : []);

	function lireSauvegarde() {
		try {
			const brut = localStorage.getItem(cleSauvegarde());
			const x = brut ? JSON.parse(brut) : null;
			if (x && JSON.stringify(x.f) !== JSON.stringify(f)) sauvegarde = x;
		} catch {
			/* stockage indisponible */
		}
		sauvegardeActive = true;
	}
	function reprendreSauvegarde() {
		if (!sauvegarde) return;
		f = sauvegarde.f;
		liees = sauvegarde.liees;
		sauvegarde = null;
	}
	function ecarterSauvegarde() {
		sauvegarde = null;
		try {
			localStorage.removeItem(cleSauvegarde());
		} catch {
			/* rien */
		}
	}
	$effect(() => {
		const instantane = JSON.stringify({ quand: new Date().toISOString(), f, liees });
		if (!sauvegardeActive || sauvegarde) return;
		const t = setTimeout(() => {
			try {
				localStorage.setItem(cleSauvegarde(), instantane);
			} catch {
				/* stockage indisponible */
			}
		}, 800);
		return () => clearTimeout(t);
	});

	async function traiter(s: Signalement) {
		try {
			await traiterSignalement(s.id);
			signalements = signalements.map((x) => (x.id === s.id ? { ...x, traite_le: new Date().toISOString() } : x));
		} catch {
			erreurEnvoi = 'Le signalement n’a pas pu être marqué comme traité.';
		}
	}

	$effect(() => {
		Promise.all([id ? chargerQuestion(id) : depuis ? chargerQuestion(depuis) : Promise.resolve(null), referentiel(), toutesLesRegles()])
			.then(([q, r, rg]) => {
				if (id) question = q;
				if (q) (f = q.formulaire), (liees = q.reglesLiees);
				if (!id && q) message = 'Copie d’une question existante : modifiez-la, puis enregistrez-la comme nouvelle question.';
				if (id && q) {
					signalementsDeQuestion(q.id).then((s) => (signalements = s)).catch(() => {});
					historiqueQuestion(q.id).then((h) => (historique = h)).catch(() => {});
				}
				themes = r.themes;
				niveaux = r.niveaux;
				regles = rg;
				etat = 'pret';
				lireSauvegarde();
			})
			.catch(() => (etat = 'erreur'));
		listerQuestions()
			.then((l) => (toutes = l))
			.catch(() => {});
	});

	const suggestions = $derived(rechercheRegle.trim() ? chercher(regles, rechercheRegle).filter((r) => !liees.some((l) => l.id === r.id)).slice(0, 8) : []);

	const versFormulaire = () => (f.regles = liees.map((l) => ({ id: l.id, principale: l.principale, passage: l.passage ?? '' })));
	function lier(r: Regle) {
		liees.push({ id: r.id, reference: r.reference, edition: r.edition, principale: liees.length === 0, passage: '' });
		versFormulaire();
		rechercheRegle = '';
	}
	function delier(idRegle: string) {
		liees = liees.filter((l) => l.id !== idRegle);
		if (liees.length && !liees.some((l) => l.principale)) liees[0].principale = true;
		versFormulaire();
	}
	function rendrePrincipale(idRegle: string) {
		liees = liees.map((l) => ({ ...l, principale: l.id === idRegle }));
		versFormulaire();
	}
	function changerPassage(idRegle: string, passage: string) {
		liees = liees.map((l) => (l.id === idRegle ? { ...l, passage } : l));
		versFormulaire();
	}

	async function enregistrer(valider: boolean, malgreAvertissements = false) {
		message = '';
		erreurEnvoi = '';
		erreurs = validerFormulaire(f);
		if (Object.keys(erreurs).length) {
			erreurEnvoi = 'Le formulaire contient des erreurs : corrigez les champs signalés.';
			return;
		}
		// Vérificateur de qualité, au moment de la validation d'un brouillon : des points à relire, qui n'empêchent pas de valider.
		avertissements = valider && !malgreAvertissements && question?.statut !== 'validee' ? avertissementsQualite(f) : [];
		if (avertissements.length) return;
		envoi = true;
		const cleAvant = cleSauvegarde();
		const etaitBrouillon = !question || question.statut === 'brouillon';
		try {
			const nouvelId = await enregistrerQuestion(id, f, valider);
			message = valider ? 'Question validée : elle est maintenant proposée aux stagiaires.' : 'Question enregistrée.';
			if (!id) {
				id = nouvelId;
				goto(`/formateur/questions/${nouvelId}`, { replaceState: true });
			}
			question = await chargerQuestion(nouvelId);
			liees = question.reglesLiees;
			ecarterSauvegarde();
			try {
				localStorage.removeItem(cleAvant);
			} catch {
				/* rien */
			}
			historiqueQuestion(nouvelId).then((h) => (historique = h)).catch(() => {});
			if (valider && etaitBrouillon) {
				brouillonSuivant = position?.suivant ?? prochains[0] ?? null;
				toutes = toutes.map((x) => (x.id === nouvelId ? { ...x, statut: 'validee' } : x));
			}
		} catch {
			erreurEnvoi = 'La question n’a pas pu être enregistrée. Vérifiez votre connexion puis réessayez.';
		} finally {
			envoi = false;
		}
	}

	async function archiver() {
		if (!id) return;
		try {
			await archiverQuestion(id);
			goto('/formateur/questions');
		} catch {
			erreurEnvoi = 'La question n’a pas pu être archivée. Réessayez.';
			confirmerArchive = false;
		}
	}
	const STATUTS: Record<string, string> = { brouillon: 'Brouillon', validee: 'Validée', archivee: 'Archivée' };
	const etatApercu = (lettre: string) => (!choixApercu ? 'neutre' : lettre === f.bonne ? 'ok' : lettre === choixApercu ? 'ko' : 'ecartee');
	const quand = (iso: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

	// Ctrl+Entrée (ou Cmd+Entrée) : valider la question.
	function raccourci(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && etat === 'pret' && !envoi) {
			e.preventDefault();
			enregistrer(true);
		}
	}
</script>

<svelte:window onkeydown={raccourci} />

<svelte:head><title>{id ? 'Modifier la question' : 'Nouvelle question'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Espace formateur">
	{#snippet navigation()}<NavFormateur />{/snippet}
</Bandeau>

<main class="page">
	<FilAriane etapes={[{ libelle: 'Espace formateur', href: '/formateur/questions' }, { libelle: 'Questions', href: '/formateur/questions' }, { libelle: id ? 'Modifier' : 'Nouvelle question' }]} />

	{#if etat === 'chargement'}
		<Chargement />
	{:else if etat === 'erreur'}
		<MessageErreur texte="La question n’a pas pu être chargée." />
	{:else}
		{#if relecture && position}
			<div class="relecture" role="status">
				<span><b>Relecture des brouillons :</b> {position.rang} / {position.total}</span>
				{#if position.suivant}<a href="/formateur/questions/{position.suivant}?relecture" data-sveltekit-reload>Passer ce brouillon</a>{/if}
			</div>
		{/if}
		{#if sauvegarde}
			<div class="sauvegarde" role="status">
				<span>Une version non enregistrée du {quand(sauvegarde.quand)} existe sur cet appareil.</span>
				<button type="button" class="btn2" onclick={reprendreSauvegarde}>La reprendre</button>
				<button type="button" class="lien" onclick={ecarterSauvegarde}>L’écarter</button>
			</div>
		{/if}
		<div class="colonnes">
			<!-- Entrée dans un champ ne doit rien enregistrer : seuls les boutons explicites agissent. -->
			<form class="carte" onsubmit={(e) => e.preventDefault()} novalidate>
				<div class="titre">
					<h1 class="titre-page"><span class="surtitre">Banque de questions</span>{id ? 'Modifier la question' : 'Nouvelle question'}</h1>
					{#if question}<span class="statut {question.statut}">{STATUTS[question.statut]}</span>{/if}
					{#if question?.a_relire}<span class="statut brouillon">À relire : une règle liée a changé d’édition</span>{/if}
				</div>

				{#if signalements.length}
					<section class="signalements" aria-label="Signalements des stagiaires">
						<h2>Signalements des stagiaires</h2>
						<ul>
							{#each signalements as s (s.id)}
								<li class:traite={!!s.traite_le}>
									<span class="texte">{s.message}</span>
									<span class="meta">{s.auteur ?? 'Stagiaire'} · {new Date(s.cree_le).toLocaleDateString('fr-FR')}{s.traite_le ? ' · traité' : ''}</span>
									{#if !s.traite_le}<button type="button" class="lien" onclick={() => traiter(s)}>Marquer comme traité</button>{/if}
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				<label class="champ">Énoncé
					<textarea rows="5" bind:value={f.enonce} aria-invalid={!!erreurs.enonce}></textarea>
					{#if erreurs.enonce}<span class="erreur">{erreurs.enonce}</span>{/if}
				</label>
				{#if doublonsTrouves.length}
					<div class="doublons" role="status">
						<b>Énoncé très proche d’une question existante :</b>
						<ul>
							{#each doublonsTrouves as d (d.id)}
								<li><a href="/formateur/questions/{d.id}" data-sveltekit-reload target="_blank" rel="noopener">{d.enonce.length > 110 ? `${d.enonce.slice(0, 110)}…` : d.enonce}</a> <span class="aide">({Math.round(d.score * 100)} % de mots communs, {STATUTS[d.statut].toLowerCase()})</span></li>
							{/each}
						</ul>
					</div>
				{/if}

				<fieldset>
					<legend>Propositions et bonne réponse</legend>
					{#each f.propositions as p, i (p.lettre)}
						<div class="proposition">
							<label class="bonne"><input type="radio" name="bonne" value={p.lettre} bind:group={f.bonne} /> <span class="vh">Bonne réponse :</span> {p.lettre}</label>
							<input class="texte" aria-label="Proposition {p.lettre}" bind:value={f.propositions[i].texte} />
							{#if f.bonne !== p.lettre}
								<input class="texte pourquoi" aria-label="Pourquoi la proposition {p.lettre} est fausse (facultatif)" placeholder="Pourquoi c’est faux (facultatif, montré après la réponse)" bind:value={f.propositions[i].explication} />
							{/if}
						</div>
					{/each}
					{#if erreurs.propositions}<span class="erreur">{erreurs.propositions}</span>{/if}
					{#if erreurs.bonne}<span class="erreur">{erreurs.bonne}</span>{/if}
					<span class="aide">Cochez la lettre de la bonne réponse.</span>
				</fieldset>

				<label class="champ">Explication (affichée après la réponse en mode pédagogique)
					<textarea rows="6" bind:value={f.explication}></textarea>
					{#if erreurs.explication}<span class="erreur">{erreurs.explication}</span>{/if}
				</label>

				<div class="ligne">
					<label class="champ">Thème
						<select bind:value={f.themeId}><option value={null}>Choisir…</option>{#each themes as t (t.id)}<option value={t.id}>{t.libelle}</option>{/each}</select>
						{#if erreurs.theme}<span class="erreur">{erreurs.theme}</span>{/if}
					</label>
					<label class="champ">Niveau
						<select bind:value={f.niveauId}><option value={null}>Choisir…</option>{#each niveaux as n (n.id)}<option value={n.id}>{n.libelle}</option>{/each}</select>
						{#if erreurs.niveau}<span class="erreur">{erreurs.niveau}</span>{/if}
					</label>
					<label class="champ">Rôle visé
						<select bind:value={f.roleCible}><option value="arbitre">Arbitre</option><option value="marqueur">Marqueur</option><option value="les_deux">Les deux</option></select>
					</label>
					<label class="champ">Usage
						<select bind:value={f.usage}><option value="entrainement">Entraînement</option><option value="reserve_examen">Réserve d’examen</option></select>
					</label>
				</div>

				<label class="champ">Vidéo (YouTube non répertorié ou FIVB Academy, facultatif)
					<input type="url" bind:value={f.videoUrl} placeholder="https://youtu.be/…" />
					{#if erreurs.video}<span class="erreur">{erreurs.video}</span>{/if}
				</label>

				<fieldset>
					<legend>Règles liées</legend>
					{#if liees.length}
						<ul class="liees">
							{#each liees as l (l.id)}
								<li>
									<span class="ref plaque">{l.reference}</span> <span class="aide">{l.edition}</span>
									{#if l.principale}<span class="statut validee">Principale</span>{:else}<button type="button" class="lien" onclick={() => rendrePrincipale(l.id)}>Rendre principale</button>{/if}
									<button type="button" class="lien" onclick={() => delier(l.id)} aria-label="Retirer {l.reference}">Retirer</button>
									<input class="texte passage" aria-label="Passage de {l.reference} à surligner (facultatif)" placeholder="Passage à surligner dans la règle (facultatif)" value={l.passage ?? ''} oninput={(e) => changerPassage(l.id, (e.target as HTMLInputElement).value)} />
								</li>
							{/each}
						</ul>
					{/if}
					<label class="champ">Ajouter une règle
						<input type="search" bind:value={rechercheRegle} placeholder="numéro (19.3.1.4, Cas 3.35) ou mots" />
					</label>
					{#if suggestions.length}
						<ul class="suggestions">
							{#each suggestions as r (r.id)}
								<li><button type="button" class="lien" onclick={() => lier(r)}><span class="ref plaque">{r.reference}</span> {r.titre ?? r.texte.slice(0, 70)}</button></li>
							{/each}
						</ul>
					{/if}
					{#if erreurs.regles}<span class="erreur">{erreurs.regles}</span>{/if}
				</fieldset>

				{#if avertissements.length}
					<div class="qualite" role="alert">
						<b>Avant de valider, relisez :</b>
						<ul>{#each avertissements as a (a)}<li>{a}</li>{/each}</ul>
						<div class="actions">
							<button type="button" class="btn2" onclick={() => (avertissements = [])}>Corriger</button>
							<button type="button" class="lien" onclick={() => enregistrer(true, true)}>Valider quand même</button>
						</div>
					</div>
				{/if}
				{#if erreurEnvoi}<p class="message-erreur" role="alert">{erreurEnvoi}</p>{/if}
				{#if message}<p class="message-info" role="status">{message}</p>{/if}
				<!-- Rechargement complet : la page d'édition lit son identifiant au démarrage. -->
				{#if brouillonSuivant}<a class="btn2" href="/formateur/questions/{brouillonSuivant}" data-sveltekit-reload>Relire le brouillon suivant</a>{/if}
				<div class="actions">
					<button class="btn" type="button" disabled={envoi} onclick={() => enregistrer(true)}>{question?.statut === 'validee' ? 'Enregistrer et garder validée' : 'Valider la question'}</button>
					<button class="btn2" type="button" disabled={envoi} onclick={() => enregistrer(false)}>{question?.statut === 'validee' ? 'Repasser en brouillon' : 'Enregistrer le brouillon'}</button>
					<button class="btn2" type="button" aria-pressed={apercu} onclick={() => ((apercu = !apercu), (choixApercu = null))}>Aperçu stagiaire</button>
					{#if id}<a class="lien" href="/formateur/questions/nouvelle?depuis={id}" data-sveltekit-reload>Dupliquer</a>{/if}
					{#if id && question?.statut !== 'archivee'}<button class="lien danger" type="button" onclick={() => (confirmerArchive = true)}>Archiver…</button>{/if}
				</div>
				<p class="aide">Raccourci : Ctrl + Entrée pour valider. Vos modifications sont gardées sur cet appareil jusqu’à l’enregistrement.</p>
			</form>

			{#if apercu}
				<aside class="carte apercu" aria-label="Aperçu côté stagiaire">
					<h2>Aperçu côté stagiaire</h2>
					<p class="aide">La question telle qu’elle s’affiche en séance pédagogique. Cliquez une réponse pour voir la correction.</p>
					<p class="enonce-apercu">{f.enonce || 'Énoncé à rédiger'}</p>
					<fieldset>
						<legend class="vh">Propositions</legend>
						{#each f.propositions as p (p.lettre)}
							<Reponse nom="apercu" valeur={p.lettre} lettre={p.lettre} texte={p.texte || '…'} etat={etatApercu(p.lettre)} choisie={choixApercu === p.lettre} desactivee={!!choixApercu} onchoisir={(v) => (choixApercu = v)} />
						{/each}
					</fieldset>
					{#if choixApercu}
						<div class="correction">
							<p class="verdict">{choixApercu === f.bonne ? 'Bonne réponse' : 'Ce n’est pas la bonne réponse'}</p>
							{#if choixApercu !== f.bonne && f.propositions.find((p) => p.lettre === choixApercu)?.explication}
								<p>{f.propositions.find((p) => p.lettre === choixApercu)?.explication}</p>
							{/if}
							<p>{f.explication || 'Explication à rédiger.'}</p>
							{#if liees.length}<p class="aide">Règle : {liees.find((l) => l.principale)?.reference ?? liees[0].reference}</p>{/if}
							<button type="button" class="lien" onclick={() => (choixApercu = null)}>Recommencer l’aperçu</button>
						</div>
					{/if}
				</aside>
			{/if}

			{#if historique.length}
				<aside class="carte historique">
					<h2>Historique des modifications</h2>
					<ol>
						{#each historique as h, i (i)}
							<li><span class="quand">{quand(h.quand)}</span> · {h.auteur ?? 'Import'} : {h.resume}</li>
						{/each}
					</ol>
				</aside>
			{/if}

			{#if question?.origine}
				<aside class="carte origine">
					<h2>Cas d’origine : {question.origine.reference}</h2>
					<p class="texte-cas">{question.origine.texte}</p>
					{#if question.origine.video_url}<a href={question.origine.video_url} target="_blank" rel="noopener">Vidéo FIVB du cas (nouvel onglet)</a>{/if}
					{#if question.origine.texte_original}
						<details><summary>Texte original (anglais, fait foi)</summary><p class="texte-cas">{question.origine.texte_original}</p></details>
					{/if}
				</aside>
			{/if}
		</div>
	{/if}
</main>

<DialogueConfirmation
	ouvert={confirmerArchive}
	titre="Archiver cette question ?"
	texte="Elle ne sera plus proposée aux stagiaires. Les réponses déjà données restent dans leur historique. Vous pourrez la retrouver avec le filtre « Archivées »."
	libelleAnnuler="Garder la question"
	libelleConfirmer="Archiver"
	onannuler={() => (confirmerArchive = false)}
	onconfirmer={archiver}
/>

<style>
	.relecture,
	.sauvegarde {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 18px;
		padding: 12px 16px;
		border-radius: var(--r);
		border: 1px solid var(--filet);
		background: var(--papier);
	}
	.sauvegarde {
		background: var(--ambre-clair);
		color: var(--ambre);
		border-color: var(--ambre-vif);
	}
	.doublons,
	.qualite {
		border: 1px solid var(--ambre-vif);
		background: var(--ambre-clair);
		color: var(--ambre);
		border-radius: var(--r);
		padding: 12px 16px;
	}
	.doublons ul,
	.qualite ul {
		margin: 6px 0 0;
		padding-left: 20px;
	}
	.qualite .actions {
		margin-top: 10px;
	}
	.apercu,
	.historique {
		flex: 1 1 340px;
		max-width: 560px;
		gap: 12px;
	}
	.enonce-apercu {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		line-height: 1.38;
	}
	.correction {
		border-top: 1px solid var(--filet);
		padding-top: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.correction p {
		margin: 0;
	}
	.verdict {
		font-weight: 700;
	}
	.historique ol {
		margin: 0;
		padding-left: 18px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 14px;
	}
	.quand {
		color: var(--doux);
	}
	.page {
		padding: 24px 40px 48px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.colonnes {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
		align-items: flex-start;
	}
	.carte {
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 24px 28px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	form.carte {
		flex: 999 1 560px;
		min-width: 0;
	}
	.origine {
		flex: 1 1 340px;
		max-width: 520px;
		gap: 12px;
	}
	.titre {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}
	h2 {
		margin: 0;
		font-size: 17px;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	legend {
		font-weight: 700;
		margin-bottom: 8px;
	}
	.proposition {
		display: flex;
		gap: 10px;
		align-items: center;
	}
	.bonne {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 18px;
		width: 52px;
		min-height: 44px;
	}
	.bonne input {
		width: 18px;
		height: 18px;
		accent-color: var(--bleu);
	}
	.texte {
		flex: 1;
		font: inherit;
		padding: 10px 12px;
		border: 1.5px solid var(--filet);
		border-radius: var(--r);
		background: var(--papier);
		color: var(--encre);
	}
	.ligne {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
	}
	.ligne .champ {
		flex: 1 1 160px;
	}
	.aide {
		font-size: 13px;
		color: var(--doux);
	}
	.erreur {
		color: var(--rouge-texte);
		font-weight: 600;
		font-size: 14px;
	}
	.liees,
	.suggestions {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.liees li {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}
	.suggestions {
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 8px 12px;
	}
	.signalements {
		background: var(--ambre-clair);
		border: 1px solid var(--ambre-vif);
		border-radius: var(--r);
		padding: 14px 18px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.signalements h2 {
		margin: 0;
		font-size: 16px;
		color: var(--ambre);
	}
	.signalements ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.signalements li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 12px;
		font-size: 14px;
	}
	.signalements li.traite {
		color: var(--doux);
	}
	.signalements .texte {
		flex-basis: 100%;
		font-size: 15px;
	}
	.signalements .meta {
		font-size: 13px;
		color: var(--doux);
	}
	.proposition .pourquoi,
	.liees .passage {
		grid-column: 1 / -1;
		font-size: 14px;
	}
	.liees .passage {
		flex-basis: 100%;
		margin-top: 4px;
	}
	.statut {
		font-size: 13px;
		font-weight: 700;
		padding: 3px 8px;
		border-radius: var(--r-petit);
	}
	.brouillon {
		background: var(--ambre-clair);
		color: var(--ambre);
	}
	.validee {
		background: var(--bleu-clair);
		color: var(--bleu-texte);
	}
	.archivee {
		background: var(--sol);
		color: var(--doux);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
	}
	.lien {
		font: inherit;
		background: none;
		border: 0;
		padding: 0;
		color: var(--bleu-texte);
		text-decoration: underline;
		cursor: pointer;
		text-align: left;
	}
	.danger {
		color: var(--rouge-texte);
		margin-left: auto;
	}
	.texte-cas {
		margin: 0;
		white-space: pre-line;
		line-height: 1.6;
		font-size: 15px;
	}
	@media (max-width: 700px) {
		.page {
			padding: 20px;
		}
	}
</style>
