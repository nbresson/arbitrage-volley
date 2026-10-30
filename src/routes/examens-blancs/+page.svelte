<script lang="ts">
	// Historique des examens blancs : la courbe des scores (seuil provisoire de 70 % en repère) et le tableau daté.
	import '#lib/components/formulaire.css';
	import BadgeReussite from '#lib/components/BadgeReussite.svelte';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import EtatVide from '#lib/components/EtatVide.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { mesExamensBlancs, type ExamenBlanc } from '#lib/data/seances.ts';
	import { SEUIL_BLANC, tempsUtilise, verdictBlanc } from '#lib/seance/resultat-blanc.ts';

	let examens = $state<ExamenBlanc[] | null>(null);
	let erreur = $state(false);
	let survol = $state<number | null>(null);

	$effect(() => {
		mesExamensBlancs()
			.then((l) => (examens = l))
			.catch(() => (erreur = true));
	});

	const pct = (e: ExamenBlanc) => (e.total ? Math.round((e.score / e.total) * 100) : 0);
	const jourCourt = (iso: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso));
	const jourLong = (iso: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso));

	// Géométrie de la courbe, en unités du viewBox (la figure s'étire en largeur, proportions gardées).
	const L = 640, H = 240, G = 48, D = 52, HAUT = 16, BAS = 34;
	const y = (v: number) => HAUT + ((100 - v) * (H - HAUT - BAS)) / 100;
	const points = $derived(
		(examens ?? []).map((e, i, t) => ({
			x: t.length === 1 ? (G + L - D) / 2 : G + (i * (L - G - D)) / (t.length - 1),
			y: y(pct(e)),
			e
		}))
	);
	const description = $derived(
		examens ? `Scores des ${examens.length} examen${examens.length > 1 ? 's' : ''} blanc${examens.length > 1 ? 's' : ''} : ${examens.map((e) => `${pct(e)} %`).join(', ')}` : ''
	);
	const pas = $derived(points.length > 1 ? (L - G - D) / (points.length - 1) : L - G - D);
	const recents = $derived([...(examens ?? [])].reverse());
</script>

<svelte:head><title>{'Mes examens blancs'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Mes examens blancs">
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<main class="page">
	<h1 class="titre-page"><span class="surtitre">S’entraîner</span>Mes examens blancs</h1>

	{#if erreur}
		<p class="message-erreur" role="alert">L’historique n’a pas pu être chargé. Vérifiez votre connexion puis rechargez la page.</p>
	{:else if !examens}
		<p role="status">Chargement de l’historique…</p>
	{:else if !examens.length}
		<EtatVide titre="Aucun examen blanc terminé" texte="Vos scores apparaîtront ici, examen après examen, pour voir vos progrès.">
			{#snippet action()}<a class="btn" href="/entrainement/nouvelle?mode=examen_entrainement">Passer un examen blanc</a>{/snippet}
		</EtatVide>
	{:else}
		<section class="carte">
			<h2>Évolution du score</h2>
			<p class="aide">Pourcentage de bonnes réponses à chaque examen. La ligne pointillée marque le seuil de réussite provisoire ({SEUIL_BLANC * 100} %).</p>
			<div class="figure">
				<svg viewBox="0 0 {L} {H}" role="img" aria-label={description}>
					{#each [0, 50, 100] as v (v)}
						<line x1={G} x2={L - D} y1={y(v)} y2={y(v)} class="grille" />
						<text x={G - 8} y={y(v) + 4} text-anchor="end" class="axe">{v} %</text>
					{/each}
					<line x1={G} x2={L - D} y1={y(SEUIL_BLANC * 100)} y2={y(SEUIL_BLANC * 100)} class="seuil" />
					<text x={L - D + 8} y={y(SEUIL_BLANC * 100) + 4} class="axe">Seuil</text>
					{#if points.length > 1}
						<polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} class="trace" />
					{/if}
					{#each points as p, i (p.e.id)}
						<circle cx={p.x} cy={p.y} r={survol === i ? 6 : 4} class="point" />
						<!-- Zone de survol plus large que le point : toute la colonne de l'examen. -->
						<rect
							x={p.x - pas / 2}
							y={HAUT}
							width={pas}
							height={H - HAUT - BAS}
							class="cible"
							role="presentation"
							onmouseenter={() => (survol = i)}
							onmouseleave={() => (survol = null)}
						/>
					{/each}
					<text x={points[0].x} y={H - 10} text-anchor={points.length > 1 ? 'start' : 'middle'} class="axe">{jourCourt(points[0].e.debut)}</text>
					{#if points.length > 1}
						<text x={points[points.length - 1].x} y={H - 10} text-anchor="end" class="axe">{jourCourt(points[points.length - 1].e.debut)}</text>
					{/if}
				</svg>
				{#if survol !== null && points[survol]}
					{@const p = points[survol]}
					<div class="bulle" style:left="{(p.x / L) * 100}%" style:top="{(p.y / H) * 100}%" aria-hidden="true">
						<b>{p.e.score} / {p.e.total}</b> · {pct(p.e)} %<span>{jourLong(p.e.debut)}</span>
					</div>
				{/if}
			</div>
		</section>

		<section class="carte">
			<h2>Tous les examens</h2>
			<div class="defile">
				<table>
					<caption class="vh">Examens blancs, du plus récent au plus ancien</caption>
					<thead><tr><th scope="col">Date</th><th scope="col">Score</th><th scope="col">Temps</th><th scope="col">Au seuil de 70 %</th><th scope="col"><span class="vh">Détail</span></th></tr></thead>
					<tbody>
						{#each recents as e (e.id)}
							<tr>
								<th scope="row">{jourLong(e.debut)}</th>
								<td class="chiffres">{e.score} / {e.total} <span class="pct">{pct(e)} %</span></td>
								<td>{tempsUtilise(e.debut, e.fin, e.duree_minutes) ?? '—'}</td>
								<td><BadgeReussite reussi={verdictBlanc(e.score, e.total).reussi} taille="petit" /></td>
								<td><a href="/examen-entrainement/{e.id}/resultat">Voir le résultat</a></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
		<div class="actions">
			<a class="btn" href="/entrainement/nouvelle?mode=examen_entrainement">Nouvel examen blanc</a>
			<a href="/">Retour à l’accueil</a>
		</div>
	{/if}
</main>

<style>
	.page {
		max-width: 960px;
		margin: 0 auto;
		padding: 32px 20px 48px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.carte {
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}
	h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 700;
	}
	.aide {
		margin: 0;
		color: var(--doux);
		font-size: 14px;
		line-height: 1.5;
	}
	.figure {
		position: relative;
	}
	svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}
	.grille {
		stroke: var(--filet-doux);
		stroke-width: 1;
	}
	.seuil {
		stroke: var(--doux);
		stroke-width: 1.5;
		stroke-dasharray: 5 4;
	}
	.axe {
		fill: var(--doux);
		font-size: 12px;
		font-family: var(--police);
	}
	.trace {
		fill: none;
		stroke: var(--trait);
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.point {
		fill: var(--trait);
		stroke: var(--papier);
		stroke-width: 2;
	}
	.cible {
		fill: transparent;
	}
	.bulle {
		position: absolute;
		transform: translate(-50%, calc(-100% - 12px));
		background: var(--tableau);
		color: var(--sur-fonce);
		border-radius: var(--r-petit);
		padding: 8px 10px;
		font-size: 14px;
		white-space: nowrap;
		pointer-events: none;
	}
	.bulle span {
		display: block;
		font-size: 12px;
		color: var(--tableau-texte-doux);
	}
	.defile {
		overflow-x: auto;
	}
	table {
		width: 100%;
		min-width: 620px;
		border-collapse: collapse;
	}
	th,
	td {
		padding: 11px 14px;
		text-align: left;
		border-bottom: 1px solid var(--filet-doux);
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
	.chiffres {
		font-weight: 800;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.pct {
		margin-left: 6px;
		font-weight: 500;
		color: var(--doux);
		font-size: 14px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
	}
</style>
