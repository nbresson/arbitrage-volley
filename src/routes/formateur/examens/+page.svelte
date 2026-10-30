<script lang="ts">
	import MessageErreur from '#lib/components/MessageErreur.svelte';
	import Icone from '#lib/components/Icone.svelte';
	import EtatVide from '#lib/components/EtatVide.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import NavFormateur from '#lib/components/NavFormateur.svelte';
	import { listerExamens, type LigneExamen } from '#lib/data/examens-formateur.ts';
	import { dateHeure } from '#lib/examen-officiel/convocation.ts';
	import { LIBELLE_STATUT } from '#lib/formateur/validation-examen.ts';
	import { ordreExamens, repereDate } from '#lib/formateur/suivi.ts';

	const ICONES_STATUT = { brouillon: 'crayon', ouvert: 'chrono', clos: 'coche' } as const;
	let examens = $state<LigneExamen[]>([]);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');

	$effect(() => {
		listerExamens()
			.then((e) => ((examens = e), (etat = 'pret')))
			.catch(() => (etat = 'erreur'));
	});

	// Les examens clos passent dans « Archives », repliée : la liste principale ne garde que le travail en cours.
	const actifs = $derived(ordreExamens(examens.filter((e) => e.statut !== 'clos')));
	const archives = $derived(examens.filter((e) => e.statut === 'clos'));
</script>

{#snippet tableau(liste: LigneExamen[], legende: string)}
	<div class="defile">
		<table>
			<caption class="vh">{legende}</caption>
			<thead><tr><th scope="col">Examen</th><th scope="col">Date</th><th scope="col">Inscrits</th><th scope="col">État</th></tr></thead>
			<tbody>
				{#each liste as e (e.id)}
					<tr>
						<th scope="row">
							<a href="/formateur/examens/{e.id}">{e.titre}</a>{#if e.lieu}<span class="sous">{e.lieu}</span>{/if}
							{#if e.statut === 'ouvert'}<a class="suivre" href="/formateur/examens/{e.id}#salle">Suivre en salle</a>{/if}
						</th>
						<td data-libelle="Date">{dateHeure(e.date_heure)}{#if e.statut !== 'clos' && repereDate(e.date_heure)}<span class="repere">{repereDate(e.date_heure)}</span>{/if}</td>
						<td class="chiffres" data-libelle="Inscrits">{e.inscrits}</td>
						<td><span class="statut {e.statut}"><Icone nom={ICONES_STATUT[e.statut]} taille={15} />{LIBELLE_STATUT[e.statut]}</span></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/snippet}

<svelte:head><title>{'Examens officiels'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Espace formateur">
	{#snippet navigation()}<NavFormateur />{/snippet}
</Bandeau>

<main class="page">
	<div class="tete">
		<h1 class="titre-page"><span class="surtitre">Espace formateur</span>Examens officiels</h1>
		<a class="btn" href="/formateur/examens/nouveau">Créer un examen</a>
	</div>
	<p class="aide">Un examen se passe en salle : vous l’ouvrez le jour J, les stagiaires inscrits saisissent le code affiché, et chacun n’a qu’une tentative.</p>
	{#if etat === 'chargement'}
		<Chargement />
	{:else if etat === 'erreur'}
		<MessageErreur texte="Les examens n’ont pas pu être chargés." />
	{:else if !examens.length}
		<EtatVide titre="Aucun examen pour l’instant" texte="Créez le premier, puis choisissez ses questions dans la réserve d’examen.">
			{#snippet action()}<a class="btn" href="/formateur/examens/nouveau">Créer un examen</a>{/snippet}
		</EtatVide>
	{:else}
		{#if actifs.length}
			{@render tableau(actifs, 'Examens en préparation ou ouverts')}
		{:else}
			<p class="aide">Aucun examen en préparation. <a href="/formateur/examens/nouveau">Créer un examen</a></p>
		{/if}
		{#if archives.length}
			<details class="archives">
				<summary>Archives : {archives.length} examen{archives.length > 1 ? 's' : ''} clos</summary>
				{@render tableau(archives, 'Examens clos')}
			</details>
		{/if}
	{/if}
</main>

<style>
	.page {
		padding: 28px 40px 48px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.tete {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		justify-content: space-between;
		align-items: center;
	}
	.aide {
		margin: 0;
		color: var(--doux);
		max-width: 46em;
	}
	.suivre {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		margin-left: 12px;
		font-size: 14px;
		font-weight: 700;
	}
	.repere {
		margin-left: 8px;
		font-size: 13px;
		font-weight: 700;
		color: var(--ambre);
	}
	/* Sur téléphone, chaque examen devient une carte : titre, date, inscrits, état. */
	@media (max-width: 700px) {
		table {
			min-width: 0;
		}
		thead {
			display: none;
		}
		tbody tr {
			display: grid;
			gap: 4px;
			padding: 12px 16px;
			border-bottom: 1px solid var(--filet-doux);
		}
		tbody th,
		tbody td {
			display: block;
			padding: 0;
			border: 0;
		}
		td[data-libelle]::before {
			content: attr(data-libelle) ' : ';
			color: var(--doux);
			font-size: 13px;
		}
	}
	.archives summary {
		cursor: pointer;
		font-weight: 700;
		min-height: 44px;
		display: flex;
		align-items: center;
	}
	.defile {
		overflow-x: auto;
	}
	table {
		width: 100%;
		min-width: 600px;
		border-collapse: collapse;
		background: var(--papier);
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
	.sous {
		display: block;
		font-weight: 400;
		font-size: 13px;
		color: var(--doux);
	}
	.chiffres {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 20px;
	}
	.statut {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 13px;
		font-weight: 700;
		padding: 4px 9px;
		border-radius: var(--r-petit);
		border: 1px solid var(--filet);
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
	}
</style>
