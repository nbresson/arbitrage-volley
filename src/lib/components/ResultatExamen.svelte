<script lang="ts">
	// Résultat d'un examen, sans correction : score, score par thème, et pour un examen officiel le badge et le seuil.
	// Entraînement (officiel = null) : liens pour revoir les thèmes faibles en mode pédagogique.
	import '#lib/components/formulaire.css';
	import BadgeReussite from '#lib/components/BadgeReussite.svelte';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import Filet from '#lib/components/Filet.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import Volet from '#lib/components/Volet.svelte';

	type Bilan = { score: number; total: number; par_theme: { theme_id?: string; theme: string; justes: number; total: number }[] };

	let { bilan, officiel, sousTitre }: { bilan: Bilan; officiel: null | { seuil: number; reussi: boolean }; sousTitre: string } = $props();

	const faibles = $derived(bilan.par_theme.filter((t) => t.total > 0 && t.justes / t.total < 5 / 6));
	const chiffres = (n: number) => String(n).padStart(2, '0').split('');
</script>

<Bandeau titre="Arbitrage volley" {sousTitre}>
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<div class="bande-filet" aria-hidden="true"></div>
<div class="score">
	<p class="etiquette-score">{officiel ? 'Score final' : 'Score de l’examen blanc'}</p>
	<div class="volets" role="img" aria-label="Score : {bilan.score} sur {bilan.total}">
		{#each chiffres(bilan.score) as c, i (i)}<Volet chiffre={c} taille="grand" />{/each}
		<span class="sur">/</span>
		{#each chiffres(bilan.total) as c, i (i)}<Volet chiffre={c} taille="grand" total />{/each}
	</div>
	{#if officiel}
		<div class="reussite">
			<BadgeReussite reussi={officiel.reussi} />
			<span>Seuil de réussite : {officiel.seuil} / {bilan.total}</span>
		</div>
	{/if}
</div>
<div class="jeu">
	<section class="themes">
		<h1>Résultat par thème</h1>
		{#if officiel}
			<p class="aide">Les corrections ne sont pas affichées. Ce résultat est transmis à vos formateurs.</p>
		{:else}
			<p class="aide">En mode examen, les corrections ne sont pas affichées. Pour comprendre vos erreurs, reprenez les thèmes faibles en mode pédagogique.</p>
		{/if}
		<div class="defile">
			<table>
				<caption class="vh">Score par thème</caption>
				<thead><tr><th scope="col">Thème</th><th scope="col">Score</th><th scope="col">Bonnes réponses</th></tr></thead>
				<tbody>
					{#each bilan.par_theme as t (t.theme_id ?? t.theme)}
						<tr>
							<th scope="row">{t.theme}</th>
							<td class="chiffres" class:faible={t.justes / t.total < 5 / 6}>{t.justes} / {t.total}</td>
							<td>
								<span class="marques" aria-hidden="true">
									{#each Array.from({ length: t.total }, (_, i) => i < t.justes) as juste, i (i)}
										<span class:juste class:faible={juste && t.justes / t.total < 5 / 6}></span>
									{/each}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
	<Filet />
	<aside class="suite">
		<h2>Et maintenant</h2>
		{#if officiel}
			<p>Vos formateurs voient ce résultat et reviendront avec vous sur les règles à retravailler. En attendant, continuez à vous entraîner en mode pédagogique.</p>
			<div class="actions">
				<a class="btn" href="/entrainement/nouvelle">S’entraîner</a>
				<a href="/">Retour à l’accueil</a>
			</div>
		{:else}
			{#if faibles.length}
				<p>Revoyez ces thèmes en mode pédagogique : chaque question y est corrigée avec la règle qui la fonde.</p>
				{#each faibles as t (t.theme_id ?? t.theme)}
					<a class="btn2" href="/entrainement/nouvelle?theme={t.theme_id}">Revoir « {t.theme} » en mode pédagogique</a>
				{/each}
			{:else}
				<p>Tous les thèmes sont à 5 bonnes réponses sur 6 ou plus.</p>
			{/if}
			<div class="actions">
				<a class="btn" href="/entrainement/nouvelle?mode=examen_entrainement">Recommencer un examen</a>
				<a href="/">Retour à l’accueil</a>
			</div>
			<p class="aide">Ce résultat d’entraînement reste privé. Seuls les examens officiels sont visibles par vos formateurs.</p>
		{/if}
	</aside>
</div>

<style>
	/* Le score affiché comme la fin d'un set : un panneau du tableau de marque. */
	.score {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px 40px;
		padding: 28px 40px 32px;
		background: var(--tableau);
		color: var(--papier);
	}
	.score::before {
		content: '';
		position: absolute;
		inset: 14px 40px;
		border: 2px solid rgb(255 255 255 / 0.04);
		pointer-events: none;
	}
	.score > * {
		position: relative;
	}
	.etiquette-score {
		flex-basis: 100%;
		margin: 0;
		font-family: var(--police-chiffres);
		font-weight: 600;
		font-size: 15px;
		letter-spacing: 0.05em;
		color: var(--tableau-texte-doux);
	}
	.volets {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.sur {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 44px;
		color: var(--tableau-texte-doux);
		padding: 0 10px;
	}
	.reussite {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
	}
	.reussite span:last-child {
		font-size: 14px;
		color: var(--tableau-texte);
	}
	.jeu {
		display: flex;
		flex-wrap: wrap;
		padding-top: 24px;
	}
	.themes {
		flex: 999 1 560px;
		min-width: 0;
		padding: 0 44px 44px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	h1 {
		margin: 0;
		font-size: 27px;
		font-weight: 600;
	}
	.aide {
		margin: 0;
		color: var(--doux);
		font-size: 15px;
		line-height: 1.6;
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
		padding: 13px 20px;
		text-align: left;
		border-bottom: 1px solid var(--filet-doux);
	}
	thead th {
		font-size: 13px;
		font-weight: 600;
		color: var(--doux);
		border-bottom-color: var(--filet);
	}
	td.chiffres {
		font-weight: 800;
		font-size: 20px;
		color: var(--bleu-texte);
	}
	td.chiffres.faible {
		color: var(--rouge-texte);
	}
	.marques {
		display: flex;
		gap: 3px;
	}
	.marques span {
		flex: 1;
		height: 14px;
		border-radius: 2px;
		background: var(--filet-doux);
	}
	.marques span.juste {
		background: var(--bleu);
	}
	.marques span.juste.faible {
		background: var(--rouge);
	}
	.suite {
		flex: 1 1 420px;
		max-width: 560px;
		min-width: 0;
		background: var(--papier);
		padding: 32px 40px 40px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.suite h2 {
		margin: 0;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 30px;
	}
	.suite p {
		margin: 0;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
		border-top: 1px solid var(--filet);
		padding-top: 16px;
	}
</style>
