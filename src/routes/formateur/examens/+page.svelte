<script lang="ts">
	import EtatVide from '#lib/components/EtatVide.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import NavFormateur from '#lib/components/NavFormateur.svelte';
	import { listerExamens, type LigneExamen } from '#lib/data/examens-formateur.ts';
	import { dateHeure } from '#lib/examen-officiel/convocation.ts';
	import { LIBELLE_STATUT } from '#lib/formateur/validation-examen.ts';

	let examens = $state<LigneExamen[]>([]);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');

	$effect(() => {
		listerExamens()
			.then((e) => ((examens = e), (etat = 'pret')))
			.catch(() => (etat = 'erreur'));
	});
</script>

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
		<p class="message-erreur" role="alert">Les examens n’ont pas pu être chargés. Vérifiez votre connexion puis rechargez la page.</p>
	{:else if !examens.length}
		<EtatVide titre="Aucun examen pour l’instant" texte="Créez le premier, puis choisissez ses questions dans la réserve d’examen.">
			{#snippet action()}<a class="btn" href="/formateur/examens/nouveau">Créer un examen</a>{/snippet}
		</EtatVide>
	{:else}
		<div class="defile">
			<table>
				<caption class="vh">Examens officiels</caption>
				<thead><tr><th scope="col">Examen</th><th scope="col">Date</th><th scope="col">Inscrits</th><th scope="col">État</th></tr></thead>
				<tbody>
					{#each examens as e (e.id)}
						<tr>
							<th scope="row"><a href="/formateur/examens/{e.id}">{e.titre}</a>{#if e.lieu}<span class="sous">{e.lieu}</span>{/if}</th>
							<td>{dateHeure(e.date_heure)}</td>
							<td class="chiffres">{e.inscrits}</td>
							<td><span class="statut {e.statut}">{LIBELLE_STATUT[e.statut]}</span></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
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
