<script lang="ts">
	import Chargement from '#lib/components/Chargement.svelte';
	// Un examen officiel, dans l'ordre du travail du formateur : informations, questions, inscrits, salle, résultats.
	// Informations et questions ne sont modifiables qu'en brouillon (la base le garantit aussi).
	import '#lib/components/formulaire.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BadgeReussite from '#lib/components/BadgeReussite.svelte';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import FilAriane from '#lib/components/FilAriane.svelte';
	import DialogueConfirmation from '#lib/components/DialogueConfirmation.svelte';
	import NavFormateur from '#lib/components/NavFormateur.svelte';
	import Volet from '#lib/components/Volet.svelte';
	import {
		cloreExamen,
		codeExamen,
		composerExamen,
		desinscrire,
		enregistrerExamen,
		inscrire,
		lireExamen,
		ouvrirExamen,
		resultatsExamen,
		statsExamen,
		type Examen,
		type ResultatStagiaire,
		type StatQuestion
	} from '#lib/data/examens-formateur.ts';
	import { csvResultats, listeControle } from '#lib/formateur/suivi.ts';
	import { listerQuestions, type LigneQuestion } from '#lib/data/questions.ts';
	import { listerComptes, type Compte } from '#lib/data/stagiaires.ts';
	import { LIBELLE_STATUT, seuilParDefaut, validerExamen, versChampDate, type FormulaireExamen } from '#lib/formateur/validation-examen.ts';

	const id = $derived(page.params.id === 'nouveau' ? null : (page.params.id ?? null));

	let examen = $state<Examen | null>(null);
	let reserve = $state<LigneQuestion[]>([]);
	let stagiaires = $state<Compte[]>([]);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	let f = $state<FormulaireExamen>({ titre: '', dateHeure: '', lieu: '', dureeMinutes: 45, seuil: null });
	let erreurs = $state<Record<string, string>>({});
	let messageInfos = $state('');
	let erreurInfos = $state('');
	let choisies = $state<string[]>([]);
	let etatQuestions = $state('');
	let erreurQuestions = $state('');
	let filtre = $state({ theme: '', niveau: '', role: '' });
	let erreurInscrits = $state('');
	let code = $state<string | null>(null);
	let resultats = $state<ResultatStagiaire[]>([]);
	let confirmer = $state<'' | 'ouvrir' | 'clore'>('');
	let erreurSalle = $state('');
	let stats = $state<StatQuestion[]>([]);
	let misAJour = $state<Date | null>(null);
	let pleinEcran = $state(false);
	let ecranCode = $state<HTMLElement>();

	const brouillon = $derived(!id || examen?.statut === 'brouillon');

	async function charger() {
		try {
			const [q, c] = await Promise.all([listerQuestions(), listerComptes()]);
			reserve = q.filter((x) => x.statut === 'validee' && x.usage === 'reserve_examen');
			stagiaires = c.filter((x) => x.role === 'stagiaire' && x.actif);
			if (id) {
				examen = await lireExamen(id);
				f = {
					titre: examen.titre,
					dateHeure: versChampDate(examen.date_heure),
					lieu: examen.lieu,
					dureeMinutes: examen.duree_minutes,
					seuil: examen.seuil_reussite
				};
				choisies = examen.questions.map((x) => x.question_id);
				if (examen.statut !== 'brouillon') {
					[code, resultats, stats] = await Promise.all([codeExamen(id), resultatsExamen(id), statsExamen(id).catch(() => [])]);
					misAJour = new Date();
				}
			}
			etat = 'pret';
		} catch {
			etat = 'erreur';
		}
	}

	$effect(() => {
		charger();
	});

	// Suivi en direct : qui a commencé, qui a terminé, rafraîchi toutes les 10 secondes tant que l'examen est ouvert.
	$effect(() => {
		if (examen?.statut !== 'ouvert' || !id) return;
		const examenId = id;
		const t = setInterval(() => actualiser(examenId), 10_000);
		return () => clearInterval(t);
	});

	async function actualiser(examenId = id) {
		if (!examenId) return;
		try {
			resultats = await resultatsExamen(examenId);
			misAJour = new Date();
			erreurSalle = '';
		} catch {
			erreurSalle = 'Les résultats n’ont pas pu être actualisés. Vérifiez votre connexion.';
		}
	}

	async function enregistrerInfos(e: SubmitEvent) {
		e.preventDefault();
		messageInfos = '';
		erreurInfos = '';
		erreurs = validerExamen(f, choisies.length);
		if (Object.keys(erreurs).length) return;
		try {
			const nouvelId = await enregistrerExamen(f, id);
			if (!id) return goto(`/formateur/examens/${nouvelId}`, { replaceState: true }).then(charger);
			messageInfos = 'Informations enregistrées.';
			examen = await lireExamen(nouvelId);
		} catch (err) {
			erreurInfos = (err as Error).message || 'L’examen n’a pas pu être enregistré. Réessayez.';
		}
	}

	async function composer(liste: string[]) {
		if (!id) return;
		const avant = choisies;
		choisies = liste;
		etatQuestions = 'Enregistrement…';
		erreurQuestions = '';
		try {
			await composerExamen(id, liste);
			etatQuestions = `${liste.length} question${liste.length > 1 ? 's' : ''} enregistrée${liste.length > 1 ? 's' : ''}.`;
		} catch (err) {
			choisies = avant;
			etatQuestions = '';
			erreurQuestions = (err as Error).message || 'La liste n’a pas pu être enregistrée. Réessayez.';
		}
	}

	const deplacer = (k: number, sens: -1 | 1) => {
		const l = [...choisies];
		[l[k], l[k + sens]] = [l[k + sens], l[k]];
		composer(l);
	};

	async function basculerInscription(s: Compte, coche: boolean) {
		if (!id || !examen) return;
		erreurInscrits = '';
		try {
			if (coche) await inscrire(id, [s.id]);
			else await desinscrire(id, s.id);
			examen.inscrits = coche ? [...examen.inscrits, s.id] : examen.inscrits.filter((x) => x !== s.id);
		} catch (err) {
			erreurInscrits = (err as Error).message || 'L’inscription n’a pas pu être modifiée. Réessayez.';
		}
	}

	async function ouvrir() {
		if (!id) return;
		erreurSalle = '';
		try {
			code = await ouvrirExamen(id);
			confirmer = '';
			await charger();
		} catch (err) {
			erreurSalle = (err as Error).message;
		}
	}

	async function clore() {
		if (!id) return;
		erreurSalle = '';
		try {
			await cloreExamen(id);
			confirmer = '';
			await charger();
		} catch (err) {
			erreurSalle = (err as Error).message;
		}
	}

	const parId = $derived(new Map(reserve.map((q) => [q.id, q])));
	const enoncesFiges = $derived(new Map((examen?.questions ?? []).map((q) => [q.question_id, q])));
	const libelle = (qid: string) => parId.get(qid)?.enonce ?? enoncesFiges.get(qid)?.enonce ?? '';
	const themes = $derived([...new Set(reserve.map((q) => q.theme).filter(Boolean))] as string[]);
	const niveaux = $derived([...new Set(reserve.map((q) => q.niveau).filter(Boolean))] as string[]);
	const disponibles = $derived(
		reserve.filter(
			(q) =>
				!choisies.includes(q.id) &&
				(!filtre.theme || q.theme === filtre.theme) &&
				(!filtre.niveau || q.niveau === filtre.niveau) &&
				(!filtre.role || q.role_cible === filtre.role || q.role_cible === 'les_deux')
		)
	);
	// Code en plein écran pour le vidéoprojecteur ; Échap ou le bouton referment.
	async function afficherPleinEcran() {
		pleinEcran = true;
		await Promise.resolve();
		ecranCode?.requestFullscreen?.().catch(() => {});
		ecranCode?.focus();
	}
	// Échap en plein écran est d'abord capté par le navigateur : la sortie du plein écran ferme aussi l'affichage.
	$effect(() => {
		const sortie = () => {
			if (!document.fullscreenElement) pleinEcran = false;
		};
		document.addEventListener('fullscreenchange', sortie);
		return () => document.removeEventListener('fullscreenchange', sortie);
	});
	function fermerPleinEcran() {
		pleinEcran = false;
		if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
	}
	const heure = (d: Date | string) => new Intl.DateTimeFormat('fr-FR', { timeStyle: 'medium' }).format(new Date(d));
	const heureCourte = (d: string) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(d));

	const controle = $derived(
		listeControle({ nbQuestions: choisies.length, inscrits: examen?.inscrits.length ?? 0, seuil: examen?.seuil_reussite ?? null, lieu: examen?.lieu ?? '' })
	);
	const avecStats = $derived(stats.some((x) => x.repondants > 0));
	const taux = (x: StatQuestion) => (x.repondants ? Math.round((x.justes / x.repondants) * 100) : 0);

	function exporterCsv() {
		if (!examen) return;
		const blob = new Blob([csvResultats(resultats)], { type: 'text/csv;charset=utf-8' });
		const lien = document.createElement('a');
		lien.href = URL.createObjectURL(blob);
		lien.download = `Résultats - ${examen.titre}.csv`;
		lien.click();
		URL.revokeObjectURL(lien.href);
	}

	const libelleEtat = { absent: 'Pas encore commencé', en_cours: 'En cours', termine: 'Terminé' } as const;
	const commences = $derived(resultats.filter((r) => r.etat !== 'absent').length);
	const termines = $derived(resultats.filter((r) => r.etat === 'termine').length);
</script>

<svelte:head><title>{id ? (examen?.titre ?? 'Examen') : 'Nouvel examen'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Espace formateur">
	{#snippet navigation()}<NavFormateur />{/snippet}
</Bandeau>

<main class="page">
	<FilAriane etapes={[{ libelle: 'Espace formateur', href: '/formateur/questions' }, { libelle: 'Examens officiels', href: '/formateur/examens' }, { libelle: id ? (examen?.titre ?? '') : 'Nouvel examen' }]} />
	<div class="tete">
		<h1 class="titre-page"><span class="surtitre">Examen officiel</span>{id ? (examen?.titre ?? 'Examen') : 'Nouvel examen'}</h1>
		{#if examen}<span class="statut {examen.statut}">{LIBELLE_STATUT[examen.statut]}</span>{/if}
	</div>

	{#if etat === 'chargement'}
		<Chargement />
	{:else if etat === 'erreur'}
		<p class="message-erreur" role="alert">L’examen n’a pas pu être chargé. Vérifiez votre connexion puis rechargez la page.</p>
	{:else}
		<!-- 1. Informations -->
		<section class="bloc">
			<h2>1. Informations</h2>
			<form onsubmit={enregistrerInfos} novalidate>
				<fieldset disabled={!brouillon}>
					<label class="champ">Titre<input bind:value={f.titre} autocomplete="off" />{#if erreurs.titre}<span class="erreur">{erreurs.titre}</span>{/if}</label>
					<div class="ligne">
						<label class="champ">Date et heure<input type="datetime-local" bind:value={f.dateHeure} />{#if erreurs.dateHeure}<span class="erreur">{erreurs.dateHeure}</span>{/if}</label>
						<label class="champ">Lieu<input bind:value={f.lieu} autocomplete="off" /></label>
					</div>
					<div class="ligne">
						<label class="champ">Durée (minutes)<input type="number" min="1" max="240" bind:value={f.dureeMinutes} />{#if erreurs.dureeMinutes}<span class="erreur">{erreurs.dureeMinutes}</span>{/if}</label>
						<label class="champ">Seuil de réussite (bonnes réponses)
							<input type="number" min="1" bind:value={f.seuil} placeholder={choisies.length ? String(seuilParDefaut(choisies.length)) : ''} />
							{#if erreurs.seuil}<span class="erreur">{erreurs.seuil}</span>{/if}
						</label>
					</div>
					{#if brouillon && choisies.length && !f.seuil}
						<button type="button" class="lien" onclick={() => (f.seuil = seuilParDefaut(choisies.length))}>Proposer 70 % : {seuilParDefaut(choisies.length)} / {choisies.length}</button>
					{/if}
				</fieldset>
				{#if erreurInfos}<p class="message-erreur" role="alert">{erreurInfos}</p>{/if}
				{#if messageInfos}<p class="message-info" role="status">{messageInfos}</p>{/if}
				{#if brouillon}<button class="btn" type="submit">{id ? 'Enregistrer les informations' : 'Créer l’examen'}</button>{/if}
			</form>
			{#if !id}<p class="aide">Une fois l’examen créé, vous choisirez ses questions et inscrirez les stagiaires.</p>{/if}
		</section>

		{#if id && examen}
			<!-- 2. Questions -->
			<section class="bloc">
				<h2>2. Questions <span class="compte">{choisies.length} question{choisies.length > 1 ? 's' : ''}</span></h2>
				{#if choisies.length}
					<ol class="choisies">
						{#each choisies as qid, k (qid)}
							<li>
								<span class="num">{k + 1}</span>
								<span class="enonce">{libelle(qid)}</span>
								{#if brouillon}
									<span class="outils">
										<button class="lien" disabled={k === 0} onclick={() => deplacer(k, -1)} aria-label="Monter la question {k + 1}">Monter</button>
										<button class="lien" disabled={k === choisies.length - 1} onclick={() => deplacer(k, 1)} aria-label="Descendre la question {k + 1}">Descendre</button>
										<button class="lien" onclick={() => composer(choisies.filter((x) => x !== qid))} aria-label="Retirer la question {k + 1}">Retirer</button>
									</span>
								{/if}
							</li>
						{/each}
					</ol>
				{/if}
				{#if etatQuestions}<p class="aide" role="status">{etatQuestions}</p>{/if}
				{#if erreurQuestions}<p class="message-erreur" role="alert">{erreurQuestions}</p>{/if}
				{#if brouillon}
					<h3>Réserve d’examen</h3>
					{#if !reserve.length}
						<p class="aide">La réserve d’examen est vide. Rédigez des questions et choisissez l’usage « Réserve d’examen » dans leur formulaire. <a href="/formateur/questions">Aller aux questions</a></p>
					{:else}
						<div class="filtres">
							<label class="champ">Thème<select bind:value={filtre.theme}><option value="">Tous</option>{#each themes as t (t)}<option>{t}</option>{/each}</select></label>
							<label class="champ">Niveau<select bind:value={filtre.niveau}><option value="">Tous</option>{#each niveaux as n (n)}<option>{n}</option>{/each}</select></label>
							<label class="champ">Rôle<select bind:value={filtre.role}><option value="">Tous</option><option value="arbitre">Arbitre</option><option value="marqueur">Marqueur</option></select></label>
						</div>
						{#if disponibles.length}
							<ul class="reserve">
								{#each disponibles as q (q.id)}
									<li>
										<span class="enonce">{q.enonce}<span class="sous">{[q.theme, q.niveau].filter(Boolean).join(' · ')}</span></span>
										<button class="btn2" onclick={() => composer([...choisies, q.id])}>Ajouter</button>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="aide">Toutes les questions de la réserve qui correspondent à ces filtres sont déjà dans l’examen.</p>
						{/if}
					{/if}
				{/if}
			</section>

			<!-- 3. Stagiaires inscrits -->
			<section class="bloc">
				<h2>3. Stagiaires inscrits <span class="compte">{examen.inscrits.length}</span></h2>
				{#if !stagiaires.length}
					<p class="aide">Aucun stagiaire actif. <a href="/formateur/stagiaires">Créer des comptes</a></p>
				{:else}
					<fieldset class="inscrits" disabled={examen.statut === 'clos'}>
						<legend class="vh">Stagiaires inscrits à l’examen</legend>
						{#each stagiaires as s (s.id)}
							<label class="case">
								<input type="checkbox" checked={examen.inscrits.includes(s.id)} onchange={(e) => basculerInscription(s, e.currentTarget.checked)} />
								{s.prenom} {s.nom}
							</label>
						{/each}
					</fieldset>
				{/if}
				{#if erreurInscrits}<p class="message-erreur" role="alert">{erreurInscrits}</p>{/if}
				{#if examen.statut === 'ouvert'}<p class="aide">Vous pouvez encore inscrire un stagiaire présent dans la salle.</p>{/if}
			</section>

			<!-- 4. En salle -->
			<section class="bloc">
				<h2>4. En salle</h2>
				{#if examen.statut === 'brouillon'}
					<p class="aide">Le jour de l’examen, ouvrez-le devant les stagiaires : un code d’accès s’affichera, à leur donner pour commencer.</p>
					<ul class="controle" aria-label="Avant l’ouverture">
						{#each controle.points as pt (pt.libelle)}
							<li class:ok={pt.ok} class:manque={!pt.ok && pt.bloquant}>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									{#if pt.ok}<path d="M4 12l5 5L20 6" />{:else}<path d="M12 7v6M12 17h.01" />{/if}
								</svg>
								<span><b>{pt.libelle}</b> : {pt.detail}{pt.ok ? '' : pt.bloquant ? ' (à faire)' : ''}</span>
							</li>
						{/each}
					</ul>
					<div class="actions">
						<a class="btn2" href="/formateur/examens/{id}/apercu">Aperçu côté stagiaire</a>
						<button class="btn" disabled={!controle.pret} onclick={() => ((confirmer = 'ouvrir'), (erreurSalle = ''))}>Ouvrir l’examen</button>
					</div>
					{#if !controle.pret}<p class="aide">Le bouton « Ouvrir l’examen » s’active quand tout est prêt.</p>{/if}
				{:else if examen.statut === 'ouvert'}
					{#if code}
						<p class="aide">Code d’accès à donner aux stagiaires :</p>
						<div class="code" role="img" aria-label="Code d’accès : {code.split('').join(' ')}">
							{#each code.split('') as c, i (i)}<Volet chiffre={c} taille="grand" />{/each}
						</div>
						<button class="btn2 plein" onclick={afficherPleinEcran}>Afficher le code en plein écran</button>
					{/if}
					<p class="aide" role="status">
						{commences} commencé(s) sur {resultats.length} inscrit(s) · {termines} terminé(s).
						Mise à jour toutes les 10 secondes{misAJour ? ` (dernière à ${heure(misAJour)})` : ''}.
					</p>
					<div class="actions">
						<button class="btn2" onclick={() => actualiser()}>Actualiser</button>
						<button class="btn" onclick={() => ((confirmer = 'clore'), (erreurSalle = ''))}>Clore l’examen</button>
					</div>
				{:else}
					<p class="aide">Examen clos. Les stagiaires ne peuvent plus répondre.</p>
				{/if}
				{#if erreurSalle && !confirmer}<p class="message-erreur" role="alert">{erreurSalle}</p>{/if}
			</section>

			<!-- 5. Résultats -->
			{#if examen.statut !== 'brouillon'}
				<section class="bloc resultats">
					<div class="titre-bloc">
						<h2>5. Résultats</h2>
						<div class="actions export">
							<button class="btn2" onclick={exporterCsv}>Exporter en CSV</button>
							<button class="btn2" onclick={() => window.print()}>Imprimer</button>
						</div>
					</div>
					<div class="defile">
						<table>
							<caption class="vh">Résultats par stagiaire</caption>
							<thead><tr><th scope="col">Stagiaire</th><th scope="col">État</th><th scope="col">Début</th><th scope="col">Réponses</th><th scope="col">Sorties d’écran</th><th scope="col">Score</th><th scope="col">Résultat</th></tr></thead>
							<tbody>
								{#each resultats as r (r.stagiaire_id)}
									<tr>
										<th scope="row"><a href="/formateur/stagiaires/{r.stagiaire_id}">{r.prenom} {r.nom}</a></th>
										<td>{examen.statut === 'clos' && r.etat === 'absent' ? 'Absent' : libelleEtat[r.etat]}</td>
										<td>{r.debut ? heureCourte(r.debut) : '—'}{r.fin ? ` → ${heureCourte(r.fin)}` : ''}</td>
										<td class="chiffres">{r.etat === 'absent' ? '—' : `${r.repondues} / ${r.nb_questions}`}</td>
										<td class:alerte={r.sorties > 0}>{r.etat === 'absent' ? '—' : r.sorties}</td>
										<td class="chiffres">{r.etat === 'termine' ? `${r.score} / ${r.total}` : '—'}</td>
										<td>{#if r.etat === 'termine' && r.reussi !== null}<BadgeReussite reussi={r.reussi} taille="petit" />{/if}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{/if}

			{#if avecStats}
				<section class="bloc">
					<h2>6. Statistiques par question</h2>
					<p class="aide">Part de bonnes réponses parmi les stagiaires qui ont terminé. Une question très ratée est peut-être mal posée : relisez-la.</p>
					<div class="defile">
						<table>
							<caption class="vh">Taux de réussite par question</caption>
							<thead><tr><th scope="col">N°</th><th scope="col">Énoncé</th><th scope="col">Bonne réponse</th><th scope="col">Réussite</th><th scope="col">Sans réponse</th></tr></thead>
							<tbody>
								{#each stats as x (x.question_id)}
									<tr class:alerte={x.repondants >= 3 && taux(x) < 40}>
										<td class="chiffres">{x.ordre}</td>
										<td class="enonce">{x.enonce}</td>
										<td class="chiffres">{x.bonne_lettre}</td>
										<td>
											<span class="taux"><span class="barre" aria-hidden="true"><span style:width="{taux(x)}%"></span></span><b>{taux(x)} %</b> <span class="sous-stat">{x.justes} / {x.repondants}</span></span>
											{#if x.repondants >= 3 && taux(x) < 40}<span class="a-relire">À relire</span>{/if}
										</td>
										<td class="chiffres">{x.sans_reponse}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			{/if}
		{/if}
	{/if}
</main>

{#if pleinEcran && code && examen}
	<div class="ecran-code" bind:this={ecranCode} tabindex="-1" role="dialog" aria-modal="true" aria-label="Code d’accès en plein écran" onkeydown={(e) => e.key === 'Escape' && fermerPleinEcran()}>
		<p class="titre-projete">{examen.titre}</p>
		<p class="consigne">Code d’accès</p>
		<div class="code-geant" role="img" aria-label="Code d’accès : {code.split('').join(' ')}">
			{#each code.split('') as c, i (i)}<span>{c}</span>{#if i === 2}<span class="tiret" aria-hidden="true">–</span>{/if}{/each}
		</div>
		<button class="fermer" onclick={fermerPleinEcran}>Fermer (Échap)</button>
	</div>
{/if}

<DialogueConfirmation
	ouvert={confirmer === 'ouvrir'}
	titre="Ouvrir l’examen maintenant ?"
	texte="Une fois ouvert, les questions et le seuil ne peuvent plus être modifiés. Un code d’accès s’affichera pour les stagiaires présents."
	libelleAnnuler="Pas encore"
	libelleConfirmer="Ouvrir l’examen"
	erreur={erreurSalle}
	onannuler={() => ((confirmer = ''), (erreurSalle = ''))}
	onconfirmer={ouvrir}
/>
<DialogueConfirmation
	ouvert={confirmer === 'clore'}
	titre="Clore l’examen pour tous ?"
	texte="Les examens encore en cours seront terminés avec les réponses déjà envoyées. Les stagiaires ne pourront plus répondre."
	libelleAnnuler="Laisser ouvert"
	libelleConfirmer="Clore l’examen"
	erreur={erreurSalle}
	onannuler={() => ((confirmer = ''), (erreurSalle = ''))}
	onconfirmer={clore}
/>

<style>
	.controle {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.controle li {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--doux);
	}
	.controle li.ok {
		color: var(--encre);
	}
	.controle li.ok svg {
		color: var(--bleu);
	}
	.controle li.manque {
		color: var(--ambre);
	}
	.titre-bloc {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	.enonce {
		max-width: 38em;
	}
	.taux {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		white-space: nowrap;
	}
	.barre {
		width: 80px;
		height: 8px;
		border-radius: 4px;
		background: var(--filet-doux);
		overflow: hidden;
	}
	.barre span {
		display: block;
		height: 100%;
		background: var(--bleu);
	}
	.sous-stat {
		font-size: 13px;
		color: var(--doux);
	}
	.a-relire {
		margin-left: 8px;
		font-size: 13px;
		font-weight: 700;
		color: var(--ambre);
	}
	@media print {
		:global(.bandeau),
		:global(.fil),
		.export,
		.bloc:not(.resultats) {
			display: none !important;
		}
	}
	.plein {
		align-self: flex-start;
	}
	td.alerte {
		color: var(--ambre);
		font-weight: 700;
	}
	.ecran-code {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: var(--tableau);
		color: var(--sur-fonce);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2vh;
		padding: 4vh 4vw;
		text-align: center;
	}
	.ecran-code:focus {
		outline: none;
	}
	.titre-projete {
		margin: 0;
		font-size: clamp(20px, 3vw, 40px);
		font-weight: 700;
	}
	.consigne {
		margin: 0;
		font-size: clamp(16px, 2vw, 28px);
		color: var(--tableau-texte-doux);
	}
	.code-geant {
		display: flex;
		gap: 2vw;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: clamp(64px, 16vw, 260px);
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.code-geant .tiret {
		color: var(--tableau-texte-doux);
	}
	.ecran-code .fermer {
		margin-top: 4vh;
		font: inherit;
		font-weight: 700;
		color: var(--sur-fonce);
		background: transparent;
		border: 1.5px solid var(--sur-fonce);
		border-radius: var(--r);
		padding: 12px 18px;
		cursor: pointer;
	}
	.page {
		padding: 28px 40px 48px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 1100px;
	}
	.tete {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 16px;
	}
	h2 {
		margin: 0;
		font-size: 20px;
		display: flex;
		align-items: baseline;
		gap: 12px;
	}
	h3 {
		margin: 8px 0 0;
		font-size: 16px;
	}
	.compte {
		font-size: 14px;
		font-weight: 600;
		color: var(--doux);
	}
	.bloc {
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	form,
	fieldset {
		display: flex;
		flex-direction: column;
		gap: 14px;
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
	}
	.ligne,
	.filtres {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	.ligne .champ {
		flex: 1 1 220px;
	}
	.erreur {
		color: var(--rouge-texte);
		font-weight: 600;
		font-size: 14px;
	}
	.btn {
		align-self: flex-start;
	}
	.aide {
		margin: 0;
		color: var(--doux);
		line-height: 1.6;
	}
	.choisies,
	.reserve {
		list-style: none;
		margin: 0;
		padding: 0;
		border: 1px solid var(--filet);
		border-radius: var(--r);
	}
	.choisies li,
	.reserve li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 14px;
		padding: 10px 14px;
		border-bottom: 1px solid var(--filet-doux);
	}
	.choisies li:last-child,
	.reserve li:last-child {
		border-bottom: 0;
	}
	.reserve {
		max-height: 420px;
		overflow-y: auto;
	}
	.num {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 18px;
		min-width: 2ch;
	}
	.enonce {
		flex: 1 1 320px;
		min-width: 0;
	}
	.sous {
		display: block;
		font-size: 13px;
		color: var(--doux);
	}
	.outils {
		display: flex;
		gap: 12px;
	}
	.lien {
		font: inherit;
		background: none;
		border: 0;
		padding: 0;
		color: var(--bleu-texte);
		text-decoration: underline;
		cursor: pointer;
		align-self: flex-start;
	}
	.lien[disabled] {
		color: var(--doux);
		text-decoration: none;
		cursor: default;
	}
	.inscrits {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 8px 16px;
	}
	.case {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.code {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	.defile {
		overflow-x: auto;
	}
	table {
		width: 100%;
		min-width: 560px;
		border-collapse: collapse;
		border: 1px solid var(--filet);
	}
	th,
	td {
		padding: 12px 16px;
		text-align: left;
		border-bottom: 1px solid var(--filet-doux);
	}
	thead th {
		font-size: 13px;
		font-weight: 600;
		color: var(--doux);
		border-bottom-color: var(--filet);
	}
	tbody th a {
		color: var(--encre);
		font-weight: 600;
	}
	.chiffres {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 20px;
	}
	.statut {
		font-size: 13px;
		font-weight: 700;
		padding: 4px 9px;
		border-radius: var(--r-petit);
		border: 1px solid var(--filet);
		background: var(--papier);
	}
	.statut.ouvert {
		background: var(--ambre-clair);
		color: var(--ambre);
		border-color: var(--ambre-vif);
	}
	.statut.clos {
		color: var(--doux);
	}
	@media (max-width: 700px) {
		.page {
			padding: 20px 16px;
		}
		.bloc {
			padding: 18px 16px;
		}
	}
</style>
