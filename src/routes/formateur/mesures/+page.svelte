<script lang="ts">
	// Mesures d'usage pour le comité : séances pédagogiques par jour et réponses par thème.
	// Des totaux seulement, calculés dans la base : aucun traceur externe, aucun détail par personne.
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	import EtatVide from '#lib/components/EtatVide.svelte';
	import MessageErreur from '#lib/components/MessageErreur.svelte';
	import NavFormateur from '#lib/components/NavFormateur.svelte';
	import { mesuresJours, mesuresThemes, type MesureJour, type MesureTheme } from '#lib/data/mesures.ts';

	let periode = $state(30);
	let jours = $state<MesureJour[]>([]);
	let themes = $state<MesureTheme[]>([]);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');

	$effect(() => {
		const p = periode;
		etat = 'chargement';
		Promise.all([mesuresJours(p), mesuresThemes(p)])
			.then(([j, t]) => ((jours = j), (themes = t), (etat = 'pret')))
			.catch(() => (etat = 'erreur'));
	});

	const totalSeances = $derived(jours.reduce((s, j) => s + j.seances, 0));
	const totalReponses = $derived(jours.reduce((s, j) => s + j.reponses, 0));
	const maxSeances = $derived(Math.max(1, ...jours.map((j) => j.seances)));
	const jourLong = (d: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${d}T12:00:00`));
</script>

<svelte:head><title>{'Mesures d’usage'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Espace formateur">
	{#snippet navigation()}<NavFormateur />{/snippet}
</Bandeau>

<main class="page">
	<h1 class="titre-page"><span class="surtitre">Pour le comité</span>Mesures d’usage</h1>
	<p class="aide">Des totaux anonymes tirés des séances pédagogiques : aucun traceur externe, aucun détail par personne. Les examens blancs, privés, ne sont pas comptés.</p>
	<label class="champ periode">Période
		<select bind:value={periode}><option value={7}>7 derniers jours</option><option value={30}>30 derniers jours</option><option value={90}>90 derniers jours</option><option value={365}>12 derniers mois</option></select>
	</label>

	{#if etat === 'chargement'}
		<Chargement />
	{:else if etat === 'erreur'}
		<MessageErreur texte="Les mesures n’ont pas pu être chargées." />
	{:else if !jours.length}
		<EtatVide titre="Aucune séance sur la période" texte="Les mesures apparaîtront dès les premières séances pédagogiques." />
	{:else}
		<div class="tuiles">
			<div><span class="chiffre">{totalSeances}</span> séances</div>
			<div><span class="chiffre">{totalReponses}</span> réponses</div>
			<div><span class="chiffre">{jours.length}</span> jours avec activité</div>
		</div>

		<section class="carte">
			<h2>Séances par jour</h2>
			<div class="defile">
				<table>
					<caption class="vh">Séances pédagogiques, stagiaires actifs et réponses par jour</caption>
					<thead><tr><th scope="col">Jour</th><th scope="col">Séances</th><th scope="col">Stagiaires actifs</th><th scope="col">Réponses</th></tr></thead>
					<tbody>
						{#each [...jours].reverse() as j (j.jour)}
							<tr>
								<th scope="row">{jourLong(j.jour)}</th>
								<td><span class="barre" aria-hidden="true"><span style:width="{(j.seances / maxSeances) * 100}%"></span></span> {j.seances}</td>
								<td class="chiffres">{j.stagiaires}</td>
								<td class="chiffres">{j.reponses}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="carte">
			<h2>Réponses par thème</h2>
			<div class="defile">
				<table>
					<caption class="vh">Réponses et réussite par thème</caption>
					<thead><tr><th scope="col">Thème</th><th scope="col">Réponses</th><th scope="col">Réussite</th></tr></thead>
					<tbody>
						{#each themes as t (t.theme)}
							<tr><th scope="row">{t.theme}</th><td class="chiffres">{t.reponses}</td><td class="chiffres">{Math.round((t.justes / t.reponses) * 100)} %</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</main>

<style>
	.page {
		padding: 28px 40px 48px;
		max-width: 1000px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.aide {
		margin: 0;
		color: var(--doux);
		max-width: 52em;
	}
	.periode {
		max-width: 260px;
	}
	.tuiles {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	.tuiles > div {
		flex: 1 1 180px;
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 16px 18px;
		color: var(--doux);
	}
	.chiffre {
		display: block;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 34px;
		color: var(--encre);
		font-variant-numeric: tabular-nums;
	}
	.carte {
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	h2 {
		margin: 0;
		font-size: 20px;
	}
	.defile {
		overflow-x: auto;
	}
	table {
		width: 100%;
		min-width: 460px;
		border-collapse: collapse;
	}
	th,
	td {
		padding: 9px 12px;
		text-align: left;
		border-bottom: 1px solid var(--filet-doux);
	}
	thead th {
		font-size: 13px;
		font-weight: 600;
		color: var(--doux);
	}
	tbody th {
		font-weight: 500;
	}
	.chiffres {
		font-variant-numeric: tabular-nums;
	}
	.barre {
		display: inline-block;
		vertical-align: middle;
		width: 120px;
		height: 8px;
		margin-right: 8px;
		border-radius: 4px;
		background: var(--filet-doux);
		overflow: hidden;
	}
	.barre span {
		display: block;
		height: 100%;
		background: var(--trait);
	}
	@media (max-width: 700px) {
		.page {
			padding: 24px 16px;
		}
	}
</style>
