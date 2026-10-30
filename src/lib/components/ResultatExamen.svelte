<script lang="ts">
	// Résultat d'un examen, sans correction : score, score par thème, et pour un examen officiel le badge et le seuil.
	// Entraînement (officiel = null) : liens pour revoir les thèmes faibles en mode pédagogique.
	// Examen blanc (blanc fourni) : verdict au seuil provisoire, temps utilisé, comparaison, rejouer, impression.
	import '#lib/components/formulaire.css';
	import { goto } from '$app/navigation';
	import BadgeReussite from '#lib/components/BadgeReussite.svelte';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import Filet from '#lib/components/Filet.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import Volet from '#lib/components/Volet.svelte';
	import { rejouerExamen, urlSeance } from '#lib/data/seances.ts';
	import { pluriel } from '#lib/domain/texte.ts';
	import { verdictBlanc } from '#lib/seance/resultat-blanc.ts';
	import { session } from '#lib/session.svelte.ts';

	type Bilan = { score: number; total: number; par_theme: { theme_id?: string; theme: string; justes: number; total: number }[] };

	type Blanc = { seanceId: string; temps: string | null; comparaison: string | null; date: string | null };

	let {
		bilan,
		officiel,
		sousTitre,
		blanc = null
	}: { bilan: Bilan; officiel: null | { seuil: number; reussi: boolean }; sousTitre: string; blanc?: Blanc | null } = $props();

	const verdict = $derived(blanc && !officiel ? verdictBlanc(bilan.score, bilan.total) : null);
	let rejeu = $state<'' | 'correction' | 'refaire'>('');
	let erreurRejeu = $state('');

	async function rejouer(avecCorrection: boolean) {
		if (!blanc) return;
		rejeu = avecCorrection ? 'correction' : 'refaire';
		erreurRejeu = '';
		try {
			const id = await rejouerExamen(blanc.seanceId, avecCorrection);
			goto(urlSeance(avecCorrection ? 'pedagogique' : 'examen_entrainement', id));
		} catch (e) {
			erreurRejeu = e instanceof Error && /disponible/.test(e.message) ? e.message : 'La séance n’a pas pu être créée. Vérifiez votre connexion puis réessayez.';
			rejeu = '';
		}
	}
	const jour = (iso: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso));

	// Un thème est « à revoir » sous 5 bonnes réponses sur 6. Ses bonnes réponses restent bleues : seule la faiblesse est écrite.
	const faible = (t: { justes: number; total: number }) => t.total > 0 && t.justes / t.total < 5 / 6;
	const faibles = $derived(bilan.par_theme.filter(faible));
	const pourcentage = $derived(bilan.total ? Math.round((bilan.score / bilan.total) * 100) : 0);
	const chiffres = (n: number) => String(n).padStart(2, '0').split('');
</script>

<Bandeau titre="Arbitrage volley" {sousTitre}>
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<div class="bande-filet" aria-hidden="true"></div>
{#if blanc}
	<p class="impression">Examen blanc{session.profil ? ` de ${session.profil.prenom} ${session.profil.nom}` : ''}{blanc.date ? `, ${jour(blanc.date)}` : ''}</p>
{/if}
<div class="score">
	<p class="etiquette-score">{officiel ? 'Score final' : 'Score de l’examen blanc'}</p>
	<div class="volets" role="img" aria-label="Score : {bilan.score} sur {bilan.total}">
		{#each chiffres(bilan.score) as c, i (i)}<Volet chiffre={c} taille="grand" />{/each}
		<span class="sur">/</span>
		{#each chiffres(bilan.total) as c, i (i)}<Volet chiffre={c} taille="grand" total />{/each}
	</div>
	<p class="pourcentage">{pourcentage} % de bonnes réponses</p>
	{#if verdict && blanc}
		<ul class="reperes">
			<li class="verdict" class:reussi={verdict.reussi}>
				{#if verdict.reussi}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6" /></svg>
				{/if}
				<span>{verdict.texte}</span>
			</li>
			{#if blanc.temps}<li>Temps utilisé : {blanc.temps}</li>{/if}
			{#if blanc.comparaison}<li>{blanc.comparaison}</li>{/if}
		</ul>
	{/if}
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
							<td class="chiffres">{t.justes} / {t.total}{#if t.justes < t.total}<span class="erreurs">{pluriel(t.total - t.justes, 'erreur')}</span>{/if}</td>
							<td>
								<span class="marques" aria-hidden="true">
									{#each Array.from({ length: t.total }, (_, i) => i < t.justes) as juste, i (i)}
										<span class:juste class:fausse={!juste}></span>
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
			{#if blanc}
				<div class="rejouer">
					<button type="button" class="btn" disabled={!!rejeu} onclick={() => rejouer(true)}>{rejeu === 'correction' ? 'Préparation…' : 'Revoir l’examen avec la correction'}</button>
					<p class="aide">Les mêmes questions, dans le même ordre, corrigées une à une avec la règle qui les fonde.</p>
					<button type="button" class="btn2" disabled={!!rejeu} onclick={() => rejouer(false)}>{rejeu === 'refaire' ? 'Préparation…' : 'Refaire le même examen'}</button>
					<p class="aide">Les mêmes questions dans un nouvel ordre, chronométrées : pour mesurer un vrai progrès.</p>
					{#if erreurRejeu}<p class="message-erreur" role="alert">{erreurRejeu}</p>{/if}
				</div>
			{/if}
			<div class="actions">
				<a class={blanc ? 'btn2' : 'btn'} href="/entrainement/nouvelle?mode=examen_entrainement">Nouvel examen blanc</a>
				{#if blanc}
					<a href="/examens-blancs">Historique de mes examens blancs</a>
					<button type="button" class="lien" onclick={() => window.print()}>Imprimer ou enregistrer en PDF</button>
				{/if}
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
		white-space: nowrap;
	}
	.erreurs {
		margin-left: 10px;
		font-family: var(--police);
		font-size: 13px;
		font-weight: 600;
		color: var(--doux);
	}
	.pourcentage {
		margin: 0;
		font-size: 17px;
		font-weight: 600;
		color: var(--tableau-texte);
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
	.marques span.fausse {
		background: var(--rouge-clair);
		border: 1px solid var(--rouge);
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
	.reperes {
		flex-basis: 100%;
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
		color: var(--tableau-texte);
		font-size: 15px;
	}
	.verdict {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 17px;
		font-weight: 700;
		color: var(--papier);
	}
	.rejouer {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
		border-top: 1px solid var(--filet);
		padding-top: 16px;
	}
	.rejouer .btn2 {
		margin-top: 10px;
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
	.impression {
		display: none;
	}
	/* Export : la page s'imprime (ou s'enregistre en PDF) sans navigation ni boutons, en noir sur blanc. */
	@media print {
		:global(.bandeau),
		.bande-filet,
		.suite {
			display: none !important;
		}
		.impression {
			display: block;
			margin: 0 0 12px;
			font-weight: 700;
			font-size: 18px;
		}
		/* Le panneau du score garde ses couleurs : sans son fond, les chiffres blancs disparaîtraient. */
		.score,
		.marques span {
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.themes {
			padding: 16px 0 0;
		}
		.defile {
			overflow: visible;
		}
	}
	/* Sur téléphone, chaque thème tient sur une carte : nom et score, puis les marques sur toute la largeur. */
	@media (max-width: 600px) {
		.score::before {
			display: none;
		}
		.score,
		.themes {
			padding-left: 20px;
			padding-right: 20px;
		}
		.defile {
			overflow: visible;
		}
		table {
			min-width: 0;
		}
		thead th:last-child {
			display: none;
		}
		tbody tr {
			display: grid;
			grid-template-columns: 1fr auto;
			column-gap: 12px;
			border-bottom: 1px solid var(--filet-doux);
			padding: 12px 16px;
		}
		tbody th,
		tbody td {
			display: block;
			padding: 0;
			border: 0;
		}
		tbody td:last-child {
			grid-column: 1 / -1;
			padding-top: 8px;
		}
	}
</style>
