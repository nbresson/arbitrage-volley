<script lang="ts">
	import Chargement from '#lib/components/Chargement.svelte';
	import '#lib/components/formulaire.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import FilAriane from '#lib/components/FilAriane.svelte';
	import DialogueConfirmation from '#lib/components/DialogueConfirmation.svelte';
	import NavFormateur from '#lib/components/NavFormateur.svelte';
	import { archiverQuestion, chargerQuestion, enregistrerQuestion, formulaireVide, listerQuestions, type QuestionComplete, type RegleLiee } from '#lib/data/questions.ts';
	import { toutesLesRegles } from '#lib/data/regles.ts';
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

	$effect(() => {
		Promise.all([id ? chargerQuestion(id) : Promise.resolve(null), referentiel(), toutesLesRegles()])
			.then(([q, r, rg]) => {
				question = q;
				if (q) (f = q.formulaire), (liees = q.reglesLiees);
				themes = r.themes;
				niveaux = r.niveaux;
				regles = rg;
				etat = 'pret';
			})
			.catch(() => (etat = 'erreur'));
	});

	const suggestions = $derived(rechercheRegle.trim() ? chercher(regles, rechercheRegle).filter((r) => !liees.some((l) => l.id === r.id)).slice(0, 8) : []);

	function lier(r: Regle) {
		liees.push({ id: r.id, reference: r.reference, edition: r.edition, principale: liees.length === 0 });
		f.regles = liees.map((l) => ({ id: l.id, principale: l.principale }));
		rechercheRegle = '';
	}
	function delier(idRegle: string) {
		liees = liees.filter((l) => l.id !== idRegle);
		if (liees.length && !liees.some((l) => l.principale)) liees[0].principale = true;
		f.regles = liees.map((l) => ({ id: l.id, principale: l.principale }));
	}
	function rendrePrincipale(idRegle: string) {
		liees = liees.map((l) => ({ ...l, principale: l.id === idRegle }));
		f.regles = liees.map((l) => ({ id: l.id, principale: l.principale }));
	}

	async function enregistrer(valider: boolean) {
		message = '';
		erreurEnvoi = '';
		erreurs = validerFormulaire(f);
		if (Object.keys(erreurs).length) {
			erreurEnvoi = 'Le formulaire contient des erreurs : corrigez les champs signalés.';
			return;
		}
		envoi = true;
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
			if (valider && etaitBrouillon) {
				brouillonSuivant = (await listerQuestions().catch(() => [])).find((q) => q.statut === 'brouillon' && q.id !== nouvelId)?.id ?? null;
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
</script>

<svelte:head><title>{id ? 'Modifier la question' : 'Nouvelle question'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Espace formateur">
	{#snippet navigation()}<NavFormateur />{/snippet}
</Bandeau>

<main class="page">
	<FilAriane etapes={[{ libelle: 'Espace formateur', href: '/formateur/questions' }, { libelle: 'Questions', href: '/formateur/questions' }, { libelle: id ? 'Modifier' : 'Nouvelle question' }]} />

	{#if etat === 'chargement'}
		<Chargement />
	{:else if etat === 'erreur'}
		<p class="message-erreur" role="alert">La question n’a pas pu être chargée. Vérifiez votre connexion puis rechargez la page.</p>
	{:else}
		<div class="colonnes">
			<!-- Entrée dans un champ ne doit rien enregistrer : seuls les boutons explicites agissent. -->
			<form class="carte" onsubmit={(e) => e.preventDefault()} novalidate>
				<div class="titre">
					<h1 class="titre-page"><span class="surtitre">Banque de questions</span>{id ? 'Modifier la question' : 'Nouvelle question'}</h1>
					{#if question}<span class="statut {question.statut}">{STATUTS[question.statut]}</span>{/if}
					{#if question?.a_relire}<span class="statut brouillon">À relire : une règle liée a changé d’édition</span>{/if}
				</div>

				<label class="champ">Énoncé
					<textarea rows="4" bind:value={f.enonce} aria-invalid={!!erreurs.enonce}></textarea>
					{#if erreurs.enonce}<span class="erreur">{erreurs.enonce}</span>{/if}
				</label>

				<fieldset>
					<legend>Propositions et bonne réponse</legend>
					{#each f.propositions as p, i (p.lettre)}
						<div class="proposition">
							<label class="bonne"><input type="radio" name="bonne" value={p.lettre} bind:group={f.bonne} /> <span class="vh">Bonne réponse :</span> {p.lettre}</label>
							<input class="texte" aria-label="Proposition {p.lettre}" bind:value={f.propositions[i].texte} />
						</div>
					{/each}
					{#if erreurs.propositions}<span class="erreur">{erreurs.propositions}</span>{/if}
					{#if erreurs.bonne}<span class="erreur">{erreurs.bonne}</span>{/if}
					<span class="aide">Cochez la lettre de la bonne réponse.</span>
				</fieldset>

				<label class="champ">Explication (affichée après la réponse en mode pédagogique)
					<textarea rows="4" bind:value={f.explication}></textarea>
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

				{#if erreurEnvoi}<p class="message-erreur" role="alert">{erreurEnvoi}</p>{/if}
				{#if message}<p class="message-info" role="status">{message}</p>{/if}
				<!-- Rechargement complet : la page d'édition lit son identifiant au démarrage. -->
				{#if brouillonSuivant}<a class="btn2" href="/formateur/questions/{brouillonSuivant}" data-sveltekit-reload>Relire le brouillon suivant</a>{/if}
				<div class="actions">
					<button class="btn" type="button" disabled={envoi} onclick={() => enregistrer(true)}>{question?.statut === 'validee' ? 'Enregistrer et garder validée' : 'Valider la question'}</button>
					<button class="btn2" type="button" disabled={envoi} onclick={() => enregistrer(false)}>{question?.statut === 'validee' ? 'Repasser en brouillon' : 'Enregistrer le brouillon'}</button>
					{#if id && question?.statut !== 'archivee'}<button class="lien danger" type="button" onclick={() => (confirmerArchive = true)}>Archiver…</button>{/if}
				</div>
			</form>

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
