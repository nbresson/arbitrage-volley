<script lang="ts">
	import RetourHaut from '#lib/components/RetourHaut.svelte';
	import { pluriel } from '#lib/domain/texte.ts';
	import EtatVide from '#lib/components/EtatVide.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import Icone from '#lib/components/Icone.svelte';
	import NavFormateur from '#lib/components/NavFormateur.svelte';
	import { listerQuestions, tauxQuestions, type LigneQuestion } from '#lib/data/questions.ts';
	import { fileRelecture, statsParTheme, trierBanque } from '#lib/formateur/banque.ts';
	import { signalementsNonTraites } from '#lib/data/signalements.ts';

	let questions = $state<LigneQuestion[]>([]);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	let signales = $state(new Map<string, number>());
	let taux = $state(new Map<string, { reponses: number; justes: number }>());
	let tri = $state<'modification' | 'theme' | 'reussite'>('modification');
	let f = $state({ statut: 'brouillon', theme: '', niveau: '', role: '', origine: '', aRelire: false, texte: '' });

	$effect(() => {
		listerQuestions()
			.then((q) => ((questions = q), (etat = 'pret')))
			.catch(() => (etat = 'erreur'));
		signalementsNonTraites()
			.then((s) => (signales = s))
			.catch(() => {});
		tauxQuestions()
			.then((t) => (taux = t))
			.catch(() => {});
	});

	const themes = $derived([...new Set(questions.map((q) => q.theme).filter(Boolean))].sort() as string[]);
	const niveaux = $derived([...new Set(questions.map((q) => q.niveau).filter(Boolean))].sort() as string[]);
	// Au-delà de 200 lignes, la liste s'allonge à la demande (le compte dit toujours combien sont affichées).
	let limite = $state(200);
	const brouillons = $derived(questions.filter((q) => q.statut === 'brouillon').length);
	const aRelire = $derived(questions.filter((q) => q.a_relire).length);
	const visibles = $derived(
		questions.filter(
			(q) =>
				(!f.statut || q.statut === f.statut) &&
				(!f.theme || q.theme === f.theme) &&
				(!f.niveau || q.niveau === f.niveau) &&
				(!f.role || q.role_cible === f.role) &&
				(!f.origine || q.origine === f.origine) &&
				(!f.aRelire || q.a_relire) &&
				(!f.texte.trim() || `${q.enonce} ${q.reference_origine ?? ''}`.toLowerCase().includes(f.texte.trim().toLowerCase()))
		)
	);
	const trieees = $derived(trierBanque(visibles, tri, taux));
	const file = $derived(fileRelecture(questions));
	const stats = $derived(statsParTheme(questions));
	const reussite = (id: string) => {
		const t = taux.get(id);
		return t?.reponses ? `${Math.round((t.justes / t.reponses) * 100)} %` : '—';
	};
	const STATUTS = {
		brouillon: { libelle: 'Brouillon', icone: 'crayon' },
		validee: { libelle: 'Validée', icone: 'coche' },
		archivee: { libelle: 'Archivée', icone: 'archive' }
	} as const;
</script>

<svelte:head><title>{'Questions'} · Arbitrage volley</title></svelte:head>

<Bandeau
	titre="Arbitrage volley"
	sousTitre="Espace formateur"
	compteurs={[
		{ valeur: brouillons, chiffres: 3, libelle: 'Brouillons à relire' },
		{ valeur: aRelire, chiffres: 2, libelle: 'À relire (nouvelle édition)' }
	]}
	resumeTexte="{brouillons} brouillons à relire · {aRelire} à relire"
>
	{#snippet navigation()}<NavFormateur />{/snippet}
</Bandeau>

<main class="page">
	<div class="entete">
		<h1 class="titre-page"><span class="surtitre">Espace formateur</span>Questions</h1>
		<div class="actions-entete">
			{#if file.length}
				<!-- Rechargement complet : la page d'édition lit son identifiant au démarrage. -->
				<a class="btn" href="/formateur/questions/{file[0]}?relecture" data-sveltekit-reload>Relire les brouillons ({file.length})</a>
				<a class="btn2" href="/formateur/questions/nouvelle">Nouvelle question</a>
			{:else}
				<a class="btn" href="/formateur/questions/nouvelle">Nouvelle question</a>
			{/if}
		</div>
	</div>

	{#if stats.length}
		<details class="stats">
			<summary>Questions par thème</summary>
			<div class="defile">
				<table>
					<caption class="vh">Nombre de questions par thème et par statut</caption>
					<thead><tr><th scope="col">Thème</th><th scope="col">Validées (entraînement)</th><th scope="col">Réserve d’examen</th><th scope="col">Brouillons</th><th scope="col">Archivées</th></tr></thead>
					<tbody>
						{#each stats as t (t.theme)}
							<tr><th scope="row">{t.theme}</th><td class="chiffres">{t.validees}</td><td class="chiffres">{t.reserve}</td><td class="chiffres">{t.brouillons}</td><td class="chiffres">{t.archivees}</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</details>
	{/if}

	<form class="filtres" onsubmit={(e) => e.preventDefault()}>
		<label class="champ">Statut
			<select bind:value={f.statut}><option value="">Tous</option><option value="brouillon">Brouillons</option><option value="validee">Validées</option><option value="archivee">Archivées</option></select>
		</label>
		<label class="champ">Thème
			<select bind:value={f.theme}><option value="">Tous</option>{#each themes as t (t)}<option>{t}</option>{/each}</select>
		</label>
		<label class="champ">Niveau
			<select bind:value={f.niveau}><option value="">Tous</option>{#each niveaux as n (n)}<option>{n}</option>{/each}</select>
		</label>
		<label class="champ">Rôle
			<select bind:value={f.role}><option value="">Tous</option><option value="arbitre">Arbitre</option><option value="marqueur">Marqueur</option><option value="les_deux">Les deux</option></select>
		</label>
		<label class="champ">Origine
			<select bind:value={f.origine}><option value="">Toutes</option><option value="casebook">Casebook</option><option value="manuelle">Rédigée</option></select>
		</label>
		<label class="champ texte">Rechercher
			<input type="search" bind:value={f.texte} placeholder="mot de l’énoncé ou « Cas 3.35 »" />
		</label>
		<label class="champ">Trier par
			<select bind:value={tri}><option value="modification">Dernière modification</option><option value="theme">Thème</option><option value="reussite">Réussite des stagiaires (les plus ratées d’abord)</option></select>
		</label>
		<label class="case"><input type="checkbox" bind:checked={f.aRelire} /> Seulement « à relire »</label>
	</form>

	{#if etat === 'chargement'}
		<Chargement />
	{:else if etat === 'erreur'}
		<p class="message-erreur" role="alert">Les questions n’ont pas pu être chargées. Vérifiez votre connexion puis rechargez la page.</p>
	{:else}
		<p class="compte" role="status">{visibles.length > limite ? `${limite} affichées sur ${visibles.length} questions` : pluriel(visibles.length, 'question')}</p>
		{#if visibles.length}
			<div class="defile">
				<table>
					<caption class="vh">Questions</caption>
					<thead><tr><th scope="col">Énoncé</th><th scope="col">Thème</th><th scope="col">Niveau</th><th scope="col">Réussite</th><th scope="col">Statut</th></tr></thead>
					<tbody>
						{#each trieees.slice(0, limite) as q (q.id)}
							<tr>
								<th scope="row">
									<a href="/formateur/questions/{q.id}">{q.enonce.length > 140 ? q.enonce.slice(0, 140) + '…' : q.enonce}</a>
									<span class="sous">{q.reference_origine ?? 'Rédigée'}{#if q.usage === 'reserve_examen'}<span class="reserve"><Icone nom="cadenas" taille={14} />réserve d’examen</span>{/if}</span>
								</th>
								<td>{q.theme ?? '—'}</td>
								<td>{q.niveau ?? '—'}</td>
								<td class="chiffres">{reussite(q.id)}</td>
								<td>
									<span class="statut {q.statut}"><Icone nom={STATUTS[q.statut].icone} taille={15} />{STATUTS[q.statut].libelle}</span>
									{#if q.a_relire}<span class="statut relire">À relire</span>{/if}
									{#if signales.get(q.id)}<span class="statut relire">{signales.get(q.id)} signalement{(signales.get(q.id) ?? 0) > 1 ? 's' : ''}</span>{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if visibles.length > limite}
				<button class="btn2 plus" onclick={() => (limite += 200)}>Afficher {Math.min(200, visibles.length - limite)} de plus</button>
			{/if}
		{:else}
			<EtatVide titre="Aucune question ne correspond" texte="Élargissez les filtres pour retrouver d’autres questions.">
				{#snippet action()}<button class="btn2" onclick={() => (f = { statut: '', theme: '', niveau: '', role: '', origine: '', aRelire: false, texte: '' })}>Effacer les filtres</button>{/snippet}
			</EtatVide>
		{/if}
	{/if}
</main>

<RetourHaut />

<style>
	td.chiffres {
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		white-space: nowrap;
	}
	.actions-entete {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}
	.stats summary {
		cursor: pointer;
		font-weight: 700;
		min-height: 44px;
		display: flex;
		align-items: center;
	}
	.page {
		padding: 28px 40px 48px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.entete {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	.filtres {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: flex-end;
	}
	.filtres .champ {
		flex: 0 1 170px;
	}
	.filtres .texte {
		flex: 1 1 240px;
	}
	.case {
		display: flex;
		gap: 8px;
		align-items: center;
		padding-bottom: 12px;
	}
	.compte {
		margin: 0;
		color: var(--doux);
	}
	.defile {
		overflow-x: auto;
	}
	table {
		width: 100%;
		min-width: 720px;
		border-collapse: collapse;
		background: var(--papier);
		border: 1px solid var(--filet);
	}
	th,
	td {
		padding: 12px 16px;
		text-align: left;
		border-bottom: 1px solid var(--filet-doux);
		vertical-align: top;
	}
	thead th {
		font-size: 13px;
		font-weight: 600;
		color: var(--doux);
		border-bottom-color: var(--filet);
	}
	tbody th {
		font-weight: 500;
	}
	tbody th a {
		color: var(--encre);
	}
	tr:hover {
		background: var(--ligne-survol);
	}
	.sous {
		display: block;
		font-size: 13px;
		color: var(--doux);
		margin-top: 4px;
	}
	.reserve {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-left: 8px;
	}
	.statut {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 13px;
		font-weight: 700;
		padding: 3px 8px;
		border-radius: var(--r-petit);
		margin: 0 4px 4px 0;
	}
	.brouillon,
	.relire {
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
	.lien {
		font: inherit;
		background: none;
		border: 0;
		padding: 0;
		color: var(--bleu-texte);
		text-decoration: underline;
		cursor: pointer;
	}
	@media (max-width: 700px) {
		.page {
			padding: 20px;
		}
	}
</style>
