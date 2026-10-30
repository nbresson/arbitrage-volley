<script lang="ts">
	import Chargement from '#lib/components/Chargement.svelte';
	// Fiche d'un stagiaire (maquette « Formateur ») : examens officiels passés, détail, règles à retravailler,
	// puis avancement en mode pédagogique. Les examens d'entraînement restent privés et n'apparaissent jamais ici.
	import '#lib/components/formulaire.css';
	import { page } from '$app/state';
	import BadgeReussite from '#lib/components/BadgeReussite.svelte';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import FilAriane from '#lib/components/FilAriane.svelte';
	import Filet from '#lib/components/Filet.svelte';
	import NavFormateur from '#lib/components/NavFormateur.svelte';
	import { lignesThemes, type Avancement } from '#lib/data/avancement.ts';
	import { detailTentative, examensDuStagiaire, inscrire, listerExamens, type DetailTentative, type ExamenPasse, type LigneExamen } from '#lib/data/examens-formateur.ts';
	import { urlRegle } from '#lib/data/regles.ts';
	import { avancement, referentiel } from '#lib/data/seances.ts';
	import { activiteStagiaires, changerPromotion, listerComptes, type Compte } from '#lib/data/stagiaires.ts';
	import { ilYa, themesFaibles } from '#lib/formateur/suivi.ts';
	import { dateHeure } from '#lib/examen-officiel/convocation.ts';
	import { casesDetail, libelleErreurs } from '#lib/formateur/fiche.ts';

	const id = page.params.id ?? '';

	let compte = $state<Compte | null>(null);
	let niveau = $state('');
	let examens = $state<ExamenPasse[]>([]);
	let av = $state<Avancement[]>([]);
	let etat = $state<'chargement' | 'pret' | 'introuvable' | 'erreur'>('chargement');
	let choisi = $state<string | null>(null);
	let detail = $state<DetailTentative | null>(null);
	let erreurDetail = $state('');
	let aInscrire = $state<LigneExamen[] | null>(null);
	let examenChoisi = $state('');
	let messageInscription = $state('');
	let erreurInscription = $state('');
	let derniere = $state<string | null>(null);
	let promotion = $state('');
	let messagePromotion = $state('');

	$effect(() => {
		Promise.all([listerComptes(), referentiel(), examensDuStagiaire(id), avancement(id)])
			.then(([cs, r, ex, a]) => {
				compte = cs.find((c) => c.id === id) ?? null;
				if (!compte) return void (etat = 'introuvable');
				niveau = r.niveaux.find((n) => n.id === compte?.niveau_id)?.libelle ?? '';
				promotion = compte.promotion ?? '';
				examens = ex;
				av = a;
				etat = 'pret';
				if (ex.length) choisir(ex[0].tentative_id);
			})
			.catch(() => (etat = 'erreur'));
		activiteStagiaires()
			.then((a) => (derniere = a.get(id) ?? null))
			.catch(() => {});
	});

	async function enregistrerPromotion(e: SubmitEvent) {
		e.preventDefault();
		messagePromotion = '';
		try {
			await changerPromotion(id, promotion);
			messagePromotion = promotion.trim() ? 'Promotion enregistrée.' : 'Promotion retirée.';
		} catch {
			messagePromotion = 'La promotion n’a pas pu être enregistrée. Réessayez.';
		}
	}

	async function choisir(tentative: string) {
		choisi = tentative;
		erreurDetail = '';
		try {
			detail = await detailTentative(tentative);
		} catch {
			detail = null;
			erreurDetail = 'Le détail de cet examen n’a pas pu être chargé. Réessayez.';
		}
	}

	async function ouvrirInscription() {
		messageInscription = '';
		erreurInscription = '';
		try {
			aInscrire = (await listerExamens()).filter((e) => e.statut !== 'clos');
			examenChoisi = aInscrire[0]?.id ?? '';
		} catch {
			erreurInscription = 'Les examens n’ont pas pu être chargés. Réessayez.';
		}
	}

	async function confirmerInscription(e: SubmitEvent) {
		e.preventDefault();
		if (!examenChoisi) return;
		try {
			await inscrire(examenChoisi, [id]);
			messageInscription = `Inscription enregistrée à « ${aInscrire?.find((x) => x.id === examenChoisi)?.titre ?? ''} ».`;
			aInscrire = null;
		} catch (err) {
			erreurInscription = (err as Error).message || 'L’inscription n’a pas pu être enregistrée. Réessayez.';
		}
	}

	const lignes = $derived(lignesThemes(av));
	const faibles = $derived(themesFaibles(av));
	const cases = $derived(detail ? casesDetail(detail) : []);
	const pourcent = (n: number, total: number) => `${Math.round((n / total) * 100)}%`;
	const formation = $derived(compte?.profil_formation === 'marqueur' ? 'Marqueur stagiaire' : 'Arbitre stagiaire');
</script>

<svelte:head><title>{compte ? `${compte.prenom} ${compte.nom} · Fiche stagiaire` : 'Fiche stagiaire'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Espace formateur">
	{#snippet navigation()}<NavFormateur />{/snippet}
</Bandeau>

{#if etat === 'chargement'}
	<div class="etat"><Chargement /></div>
{:else if etat === 'erreur'}
	<p class="etat message-erreur" role="alert">La fiche n’a pas pu être chargée. Vérifiez votre connexion puis rechargez la page.</p>
{:else if etat === 'introuvable' || !compte}
	<p class="etat">Ce compte n’existe pas. <a href="/formateur/stagiaires">Retour aux stagiaires</a></p>
{:else}
	<div class="entete">
		<div class="qui">
			<FilAriane etapes={[{ libelle: 'Espace formateur', href: '/formateur/questions' }, { libelle: 'Stagiaires', href: '/formateur/stagiaires' }, { libelle: `${compte.prenom} ${compte.nom}` }]} />
			<h1 class="titre-page"><span class="surtitre">Fiche stagiaire</span>{compte.prenom} {compte.nom}</h1>
			<div class="sous">{formation}{niveau ? ` · ${niveau}` : ''}{compte.actif ? '' : ' · compte désactivé'}</div>
		</div>
		<button class="btn" onclick={ouvrirInscription}>Inscrire à un examen officiel</button>
	</div>

	<div class="resume-fiche">
		<div>
			<p class="etiquette">Dernière activité</p>
			<p class="valeur">{ilYa(derniere)}</p>
		</div>
		<div>
			<p class="etiquette">À retravailler</p>
			{#if faibles.length}
				<ul class="faibles">
					{#each faibles as t (t.theme_id)}<li>{t.theme} <span class="sous">{t.a_revoir} à revoir</span></li>{/each}
				</ul>
			{:else}
				<p class="valeur">Aucun thème à revoir pour l’instant</p>
			{/if}
		</div>
		<form class="promotion" onsubmit={enregistrerPromotion}>
			<label class="champ">Promotion<input bind:value={promotion} autocomplete="off" placeholder="ex. Session automne 2026" /></label>
			<button class="btn2" type="submit">Enregistrer</button>
			{#if messagePromotion}<p class="aide" role="status">{messagePromotion}</p>{/if}
		</form>
	</div>

	{#if aInscrire || messageInscription || erreurInscription}
		<div class="inscription">
			{#if aInscrire}
				{#if aInscrire.length}
					<form onsubmit={confirmerInscription}>
						<label class="champ">Examen
							<select bind:value={examenChoisi}>{#each aInscrire as x (x.id)}<option value={x.id}>{x.titre} · {dateHeure(x.date_heure)}</option>{/each}</select>
						</label>
						<div class="actions">
							<button class="btn" type="submit">Inscrire</button>
							<button class="lien" type="button" onclick={() => (aInscrire = null)}>Annuler</button>
						</div>
					</form>
				{:else}
					<p>Aucun examen à venir. <a href="/formateur/examens/nouveau">Créer un examen</a></p>
				{/if}
			{/if}
			{#if messageInscription}<p class="message-info" role="status">{messageInscription}</p>{/if}
			{#if erreurInscription}<p class="message-erreur" role="alert">{erreurInscription}</p>{/if}
		</div>
	{/if}

	{#if !examens.length}
		<div class="vide">
			<h2 class="condense">Aucun examen officiel passé</h2>
			<p class="aide">Les résultats apparaîtront ici dès que ce stagiaire aura passé un examen officiel. Ses examens d’entraînement restent privés.</p>
		</div>
	{:else}
		<div class="jeu">
			<section class="examens">
				<h2>Examens officiels</h2>
				<div class="defile">
					<table>
						<caption class="vh">Examens officiels passés. Choisissez un examen pour voir son détail.</caption>
						<thead><tr><th scope="col">Examen</th><th scope="col">Date</th><th scope="col">Score</th><th scope="col">Résultat</th></tr></thead>
						<tbody>
							{#each examens as e (e.tentative_id)}
								<tr class:sel={choisi === e.tentative_id} aria-current={choisi === e.tentative_id ? 'true' : undefined}>
									<th scope="row"><button class="lien-ex" onclick={() => choisir(e.tentative_id)}>{e.titre}</button></th>
									<td class="doux">{dateHeure(e.date_heure)}</td>
									<td class="chiffres">{e.score} / {e.total}</td>
									<td><BadgeReussite reussi={e.reussi} taille="petit" /></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="note">Les examens d’entraînement du stagiaire restent privés et n’apparaissent pas ici.</p>
			</section>
			<Filet />
			<aside class="detail" aria-live="polite" aria-label="Détail de l’examen choisi">
				{#if erreurDetail}
					<p class="message-erreur" role="alert">{erreurDetail}</p>
				{:else if detail}
					<div>
						<h2 class="condense">{detail.titre}</h2>
						<div class="doux">{dateHeure(detail.date_heure)} · {detail.score} / {detail.total} · seuil {detail.seuil} / {detail.total}</div>
					</div>
					<h3>Détail question par question</h3>
					<ol class="grille" aria-label="Réponses par question">
						{#each cases as c (c.n)}<li class:ok={c.juste} class:ko={!c.juste} aria-label={c.aria}>{c.n}</li>{/each}
					</ol>
					<div class="legende">
						<span><span class="pastille ok"></span>Juste (case pleine)</span>
						<span><span class="pastille ko"></span>Fausse ou sans réponse (case vide)</span>
					</div>
					<div class="regles">
						<h3>Règles à retravailler</h3>
						{#each detail.regles as r (r.edition + r.reference)}
							<div><a class="ref plaque" href={urlRegle(r)}>{r.reference}</a> <span class="doux">{r.titre ? `${r.titre} · ` : ''}{libelleErreurs(r.erreurs)}</span></div>
						{:else}
							<p class="doux">Aucune : toutes les réponses sont justes.</p>
						{/each}
					</div>
				{:else}
					<p role="status">Chargement du détail…</p>
				{/if}
			</aside>
		</div>
	{/if}

	<section class="entrainement">
		<h2>Entraînement</h2>
		<p class="aide">Avancement en mode pédagogique : une question est acquise si sa dernière réponse est juste, à revoir si elle est fausse.</p>
		{#if !lignes.length}
			<p class="aide">Aucune question d’entraînement validée pour l’instant.</p>
		{:else}
			<div class="defile">
				<table>
					<caption class="vh">Avancement par thème</caption>
					<thead><tr><th scope="col">Thème</th><th scope="col">Acquises</th><th scope="col">À revoir</th><th scope="col">Avancement</th></tr></thead>
					<tbody>
						{#each lignes as l (l.themeId)}
							<tr>
								<th scope="row">{l.theme}<span class="sous">{l.total} questions</span></th>
								{#if l.commence}
									<td class="chiffres bleu">{l.acquises}</td>
									<td class="chiffres rouge">{l.aRevoir}</td>
									<td><span class="barre" aria-hidden="true"><span class="b" style="width: {pourcent(l.acquises, l.total)}"></span><span class="r" style="width: {pourcent(l.aRevoir, l.total)}"></span></span></td>
								{:else}
									<td colspan="3" class="doux">Pas encore commencé</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
{/if}

<style>
	.resume-fiche {
		margin: 16px 40px 8px;
		display: flex;
		flex-wrap: wrap;
		gap: 16px 40px;
		align-items: flex-start;
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 18px 22px;
	}
	.resume-fiche p {
		margin: 0;
	}
	.etiquette {
		font-size: 13px;
		color: var(--doux);
	}
	.valeur {
		font-weight: 700;
	}
	.faibles .sous {
		display: inline;
		font-size: 13px;
		font-weight: 400;
		margin: 0 0 0 4px;
	}
	.faibles {
		list-style: none;
		margin: 0;
		padding: 0;
		font-weight: 700;
	}
	.promotion {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 10px;
		margin-left: auto;
	}
	@media (max-width: 700px) {
		.resume-fiche {
			margin: 0 16px 8px;
		}
		.promotion {
			margin-left: 0;
		}
	}
	.etat {
		margin: 40px;
	}
	.entete {
		padding: 24px 40px 0;
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 16px 24px;
	}
	.qui {
		flex: 1 1 360px;
	}
	h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 700;
	}
	h2.condense {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 26px;
	}
	h3 {
		margin: 0;
		font-size: 15px;
		font-weight: 700;
	}
	.sous {
		display: block;
		font-size: 15px;
		color: var(--doux);
		margin-top: 4px;
	}
	tbody .sous {
		font-size: 13px;
		margin: 0;
		font-weight: 400;
	}
	.doux {
		color: var(--doux);
		margin: 0;
	}
	.aide {
		margin: 0;
		color: var(--doux);
		line-height: 1.6;
	}
	.inscription {
		margin: 16px 40px 0;
		max-width: 640px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.inscription form {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.actions {
		display: flex;
		gap: 16px;
		align-items: center;
	}
	.vide {
		margin: 24px 40px 0;
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-width: 640px;
	}
	.jeu {
		display: flex;
		flex-wrap: wrap;
		padding: 24px 40px 0;
		row-gap: 24px;
	}
	.examens {
		flex: 999 1 560px;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding-right: 32px;
	}
	.detail {
		flex: 1 1 440px;
		max-width: 600px;
		min-width: 0;
		background: var(--papier);
		padding: 24px 32px 32px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		border: 1px solid var(--filet);
		border-left: 0;
	}
	.defile {
		overflow-x: auto;
	}
	table {
		width: 100%;
		min-width: 520px;
		border-collapse: collapse;
		background: var(--papier);
		border: 1px solid var(--filet);
	}
	th,
	td {
		padding: 14px 20px;
		text-align: left;
		border-bottom: 1px solid var(--filet-doux);
	}
	thead th {
		font-size: 13px;
		font-weight: 600;
		color: var(--doux);
		padding: 12px 20px;
		border-bottom-color: var(--filet);
	}
	tr.sel {
		background: var(--bleu-clair);
	}
	.lien-ex {
		font: inherit;
		font-weight: 600;
		color: var(--encre);
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		text-align: left;
		text-decoration: underline;
		text-decoration-color: var(--filet);
		text-underline-offset: 4px;
	}
	.lien-ex:hover {
		text-decoration-color: var(--encre);
	}
	.lien {
		font: inherit;
		background: none;
		border: 0;
		padding: 0;
		color: var(--bleu-texte);
		text-decoration: underline;
		cursor: pointer;
	}
	.chiffres {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 20px;
		font-variant-numeric: tabular-nums;
	}
	.bleu {
		color: var(--bleu-texte);
	}
	.rouge {
		color: var(--rouge-texte);
	}
	.note {
		margin: 0;
		font-size: 13px;
		color: var(--doux);
	}
	.grille {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(10, minmax(0, 1fr));
		gap: 5px;
	}
	.grille li {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 15px;
		font-variant-numeric: tabular-nums;
		height: 38px;
		border-radius: var(--r-petit);
		display: grid;
		place-items: center;
	}
	.grille li.ok {
		background: var(--bleu);
		color: var(--sur-fonce);
	}
	.grille li.ko {
		background: var(--papier);
		color: var(--rouge-texte);
		border: 2px solid var(--rouge);
	}
	.legende {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		font-size: 13px;
		color: var(--doux);
	}
	.legende > span {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.pastille {
		width: 12px;
		height: 12px;
		border-radius: 2px;
		box-sizing: border-box;
	}
	.pastille.ok {
		background: var(--bleu);
	}
	.pastille.ko {
		border: 2px solid var(--rouge);
	}
	.regles {
		border-top: 1px solid var(--filet);
		padding-top: 14px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		line-height: 1.5;
	}
	.ref {
		font-size: 18px;
	}
	.entrainement {
		padding: 32px 40px 48px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.barre {
		display: flex;
		height: 10px;
		border-radius: 2px;
		overflow: hidden;
		background: var(--filet-doux);
	}
	.barre .b {
		background: var(--bleu);
	}
	.barre .r {
		background: var(--rouge);
	}
	@media (max-width: 700px) {
		.entete,
		.jeu,
		.entrainement {
			padding-left: 16px;
			padding-right: 16px;
		}
		.inscription,
		.vide {
			margin-left: 16px;
			margin-right: 16px;
		}
		.examens {
			padding-right: 0;
		}
		.detail {
			border-left: 1px solid var(--filet);
			padding: 20px 16px;
		}
	}
</style>
