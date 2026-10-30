<script lang="ts">
	import RetourHaut from '#lib/components/RetourHaut.svelte';
	import { titreLisible } from '#lib/domain/texte.ts';
	import EtatVide from '#lib/components/EtatVide.svelte';
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { page } from '$app/state';
	import { mesEpingles, toutesLesRegles, urlRegle } from '#lib/data/regles.ts';
	import { chercher, construireArbre, type NoeudRegle, type Regle } from '#lib/regles/arbre.ts';
	import { extrait, rechercheActive, segmentsSurlignes } from '#lib/regles/lecture.ts';

	let regles = $state<Regle[]>([]);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	let source = $state<'fivb_regles' | 'casebook' | 'cfa' | 'epinglees'>(page.url.searchParams.get('vue') === 'mes-regles' ? 'epinglees' : 'fivb_regles');
	let requete = $state(page.url.searchParams.get('q') ?? '');
	let epinglees = $state<string[]>([]);

	$effect(() => {
		toutesLesRegles()
			.then((r) => ((regles = r), (etat = 'pret')))
			.catch(() => (etat = 'erreur'));
		mesEpingles()
			.then((e) => (epinglees = e))
			.catch(() => {});
	});

	// L'onglet CFA n'apparaît que lorsqu'une consigne d'une édition active existe.
	const avecCfa = $derived(regles.some((r) => r.source === 'cfa'));
	const deLaSource = $derived(source === 'epinglees' ? regles : regles.filter((r) => r.source === source));
	const active = $derived(rechercheActive(requete));
	const resultats = $derived(active ? chercher(deLaSource, requete) : []);
	const parId = $derived(new Map(regles.map((r) => [r.id, r])));
	const mesRegles = $derived(epinglees.map((id) => parId.get(id)).filter((r): r is Regle => !!r));
	const arbre = $derived(construireArbre(deLaSource));
</script>

<svelte:head><title>{'Règles'} · Arbitrage volley</title></svelte:head>

{#snippet surligne(texte: string)}{#each segmentsSurlignes(texte, requete) as seg, i (i)}{#if seg.marque}<mark>{seg.texte}</mark>{:else}{seg.texte}{/if}{/each}{/snippet}

{#snippet noeud(n: NoeudRegle)}
	{#if n.enfants.length}
		<details>
			<summary><a href={urlRegle(n.regle)} class="ref">{n.regle.reference}</a> {titreLisible(n.regle.titre)}</summary>
			<ul>
				{#each n.enfants as e (e.regle.id)}<li>{@render noeud(e)}</li>{/each}
			</ul>
		</details>
	{:else}
		<a href={urlRegle(n.regle)} class="ref">{n.regle.reference}</a>
		<span class="apercu">{titreLisible(n.regle.titre) || n.regle.texte.slice(0, 90)}</span>
	{/if}
{/snippet}

<Bandeau titre="Arbitrage volley" sousTitre="Règles et interprétations">
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<main class="page">
	<h1 class="titre-page"><span class="surtitre">Règlement FIVB · Casebook{avecCfa ? ' · Consignes CFA' : ''}</span>Règles</h1>
	<div class="outils">
		<div role="tablist" aria-label="Source" class="onglets">
			<button role="tab" aria-selected={source === 'fivb_regles'} onclick={() => (source = 'fivb_regles')}>Règles officielles FIVB</button>
			<button role="tab" aria-selected={source === 'casebook'} onclick={() => (source = 'casebook')}>Casebook FIVB</button>
			{#if avecCfa}<button role="tab" aria-selected={source === 'cfa'} onclick={() => (source = 'cfa')}>Consignes CFA</button>{/if}
			<button role="tab" aria-selected={source === 'epinglees'} onclick={() => (source = 'epinglees')}>Mes règles{epinglees.length ? ` (${epinglees.length})` : ''}</button>
		</div>
		<label class="champ recherche">
			Chercher un numéro ou des mots
			<input id="recherche-regles" type="search" bind:value={requete} placeholder="ex. 19.3.1.4, Cas 3.35, libéro passe" aria-describedby="aide-recherche" />
			<span class="aide" id="aide-recherche">Les résultats s’affichent dès deux lettres. Raccourci : touche « / ».</span>
		</label>
	</div>

	{#if etat === 'chargement'}
		<p role="status">Chargement des règles…</p>
	{:else if etat === 'erreur'}
		<p class="message-erreur" role="alert">Les règles n’ont pas pu être chargées. Vérifiez votre connexion puis rechargez la page.</p>
	{:else if active}
		<p class="compte" role="status">{resultats.length} résultat{resultats.length > 1 ? 's' : ''}{resultats.length > 100 ? ' (les 100 premiers affichés)' : ''}</p>
		{#if resultats.length}
			<ul class="liste resultats">
				{#each resultats.slice(0, 100) as r (r.id)}
					<li>
						<a href={urlRegle(r)} class="ref">{r.reference}</a>
						{#if titreLisible(r.titre)}<span class="titre">{@render surligne(titreLisible(r.titre))}</span>{/if}
						<span class="apercu">{@render surligne(extrait(r.texte, requete, 180))}</span>
						{#if source === 'epinglees'}<span class="edition">{r.edition}</span>{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<EtatVide titre="Aucune règle ne correspond" texte="Essayez un numéro (« 12.4 ») ou d’autres mots." />
		{/if}
	{:else if source === 'epinglees'}
		{#if mesRegles.length}
			<ul class="liste resultats">
				{#each mesRegles as r (r.id)}
					<li><a href={urlRegle(r)} class="ref">{r.reference}</a> <span class="titre">{titreLisible(r.titre) || r.texte.slice(0, 90)}</span><span class="edition">{r.edition}</span></li>
				{/each}
			</ul>
		{:else}
			<EtatVide titre="Aucune règle épinglée" texte="Sur la fiche d’une règle, le bouton « Épingler » la range ici pour la retrouver vite." />
		{/if}
	{:else}
		<ul class="liste">
			{#each arbre as n (n.regle.id)}<li>{@render noeud(n)}</li>{/each}
		</ul>
	{/if}
</main>

<RetourHaut />

<style>
	.page {
		max-width: 960px;
		margin: 0 auto;
		padding: 32px 20px 48px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.outils {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		align-items: flex-end;
	}
	.onglets {
		display: flex;
		border-bottom: 1px solid var(--filet);
	}
	.onglets button {
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		padding: 11px 16px;
		border: 0;
		background: transparent;
		color: var(--doux);
		cursor: pointer;
	}
	.onglets button[aria-selected='true'] {
		color: var(--encre);
		box-shadow: inset 0 -3px 0 var(--bleu);
	}
	.recherche {
		flex: 1 1 280px;
	}
	.liste,
	.liste :global(ul) {
		list-style: none;
		margin: 0;
		padding: 0 0 0 18px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.liste {
		padding: 16px 20px;
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
	}
	.ref {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 17px;
		color: var(--encre);
	}
	.apercu {
		color: var(--doux);
	}
	summary {
		cursor: pointer;
		font-weight: 600;
	}
	.resultats li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px 10px;
		padding: 6px 0;
		border-bottom: 1px solid var(--filet-doux);
	}
	.resultats li:last-child {
		border-bottom: 0;
	}
	.resultats .titre {
		font-weight: 600;
	}
	.resultats .apercu {
		flex-basis: 100%;
		line-height: 1.5;
	}
	.edition {
		font-size: 13px;
		color: var(--doux);
	}
	mark {
		background: var(--ambre-clair);
		color: inherit;
		border-radius: 2px;
		box-shadow: 0 0 0 1px var(--ambre-vif);
	}
	.aide {
		font-size: 13px;
		font-weight: 400;
		color: var(--doux);
	}
	.compte {
		margin: 0;
		color: var(--doux);
	}
</style>
