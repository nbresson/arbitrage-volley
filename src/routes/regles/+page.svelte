<script lang="ts">
	import MessageErreur from '#lib/components/MessageErreur.svelte';
	import RetourHaut from '#lib/components/RetourHaut.svelte';
	import { titreLisible } from '#lib/domain/texte.ts';
	import EtatVide from '#lib/components/EtatVide.svelte';
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { mesEpingles, toutesLesRegles, urlRegle } from '#lib/data/regles.ts';
	import { chercher, construireArbre, type NoeudRegle, type Regle } from '#lib/regles/arbre.ts';
	import { comptesParSource, extrait, rechercheActive, segmentsSurlignes, vueDeSource, type VueRegles } from '#lib/regles/lecture.ts';

	let regles = $state<Regle[]>([]);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	type Onglet = 'fivb_regles' | 'casebook' | 'cfa' | 'epinglees';
	const DEPUIS_VUE: Record<string, Onglet> = { fivb: 'fivb_regles', casebook: 'casebook', cfa: 'cfa', 'mes-regles': 'epinglees' };
	let source = $state<Onglet>(DEPUIS_VUE[page.url.searchParams.get('vue') ?? ''] ?? 'fivb_regles');
	// Pendant une recherche, les résultats couvrent toutes les sources ; cliquer un onglet les restreint à celle-ci.
	let filtreRecherche = $state(false);
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
	const parId = $derived(new Map(regles.map((r) => [r.id, r])));
	const mesRegles = $derived(epinglees.map((id) => parId.get(id)).filter((r): r is Regle => !!r));
	const deLaSource = $derived(source === 'epinglees' ? mesRegles : regles.filter((r) => r.source === source));
	const active = $derived(rechercheActive(requete));
	const trouvees = $derived(active ? chercher(source === 'epinglees' ? mesRegles : regles, requete) : []);
	const comptes = $derived(comptesParSource(trouvees));
	const resultats = $derived(filtreRecherche && source !== 'epinglees' ? trouvees.filter((r) => r.source === source) : trouvees);
	const NOMS_SOURCES = { fivb_regles: 'FIVB', casebook: 'Casebook', cfa: 'CFA' } as const;

	function choisirOnglet(o: Onglet) {
		source = o;
		filtreRecherche = active;
	}
	// Onglet et recherche gardés dans l'adresse : le retour arrière depuis une fiche les retrouve.
	$effect(() => {
		const vue: VueRegles = source === 'epinglees' ? 'mes-regles' : vueDeSource(source);
		const q = requete.trim();
		try {
			replaceState(`?vue=${vue}${q ? `&q=${encodeURIComponent(q)}` : ''}`, {});
		} catch {
			/* routeur pas encore prêt au tout premier affichage : l'adresse sera mise à jour au changement suivant */
		}
	});
	$effect(() => {
		requete;
		filtreRecherche = false;
	});
	const arbre = $derived(construireArbre(deLaSource));
</script>

<svelte:head><title>{'Règles'} · Arbitrage volley</title></svelte:head>

{#snippet surligne(texte: string)}{#each segmentsSurlignes(texte, requete) as seg, i (i)}{#if seg.marque}<mark>{seg.texte}</mark>{:else}{seg.texte}{/if}{/each}{/snippet}

{#snippet noeud(n: NoeudRegle)}
	{#if n.enfants.length}
		<!-- Le résumé ne contient pas de lien (contrôles imbriqués) : le lien vers l'article ouvre la liste dépliée. -->
		<details>
			<summary><span class="ref">{n.regle.reference}</span> {titreLisible(n.regle.titre)}</summary>
			<ul>
				<li><a href={urlRegle(n.regle)} class="ouvrir">Lire l’article {n.regle.reference}</a></li>
				{#each n.enfants as e (e.regle.id)}<li>{@render noeud(e)}</li>{/each}
			</ul>
		</details>
	{:else}
		<a href={urlRegle(n.regle)} class="ligne"><span class="ref">{n.regle.reference}</span> <span class="apercu">{titreLisible(n.regle.titre) || n.regle.texte.slice(0, 90)}</span></a>
	{/if}
{/snippet}

<Bandeau titre="Arbitrage volley" sousTitre="Règles et interprétations">
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<main class="page">
	<h1 class="titre-page"><span class="surtitre">Règlement FIVB · Casebook{avecCfa ? ' · Consignes CFA' : ''}</span>Règles</h1>
	<div class="outils">
		<div role="tablist" aria-label="Source" class="onglets">
			<button role="tab" aria-selected={source === 'fivb_regles'} onclick={() => choisirOnglet('fivb_regles')}><span class="long">Règles officielles FIVB</span><span class="court">FIVB</span>{active ? ` (${comptes.fivb_regles})` : ''}</button>
			<button role="tab" aria-selected={source === 'casebook'} onclick={() => choisirOnglet('casebook')}><span class="long">Casebook FIVB</span><span class="court">Casebook</span>{active ? ` (${comptes.casebook})` : ''}</button>
			{#if avecCfa}<button role="tab" aria-selected={source === 'cfa'} onclick={() => choisirOnglet('cfa')}><span class="long">Consignes CFA</span><span class="court">CFA</span>{active ? ` (${comptes.cfa})` : ''}</button>{/if}
			<button role="tab" aria-selected={source === 'epinglees'} onclick={() => choisirOnglet('epinglees')}>Mes règles{epinglees.length ? ` (${epinglees.length})` : ''}</button>
		</div>
		<label class="champ recherche">
			Chercher un numéro ou des mots
			<input id="recherche-regles" type="search" bind:value={requete} placeholder="ex. 19.3.1.4, Cas 3.35, libéro passe" aria-describedby="aide-recherche" />
			<span class="aide" id="aide-recherche">Les résultats s’affichent dès deux lettres.{' '}<span class="clavier">Raccourci : touche « / ».</span></span>
		</label>
	</div>

	{#if etat === 'chargement'}
		<p role="status">Chargement des règles…</p>
	{:else if etat === 'erreur'}
		<MessageErreur texte="Les règles n’ont pas pu être chargées." />
	{:else if active}
		<p class="compte" role="status">{resultats.length} résultat{resultats.length > 1 ? 's' : ''}{resultats.length > 100 ? ' (les 100 premiers affichés)' : ''}</p>
		{#if resultats.length}
			<ul class="liste resultats">
				{#each resultats.slice(0, 100) as r (r.id)}
					<li>
						<a href={urlRegle(r)} class="ligne">
							<span class="ref">{r.reference}</span>
							<span class="badge">{NOMS_SOURCES[r.source]}</span>
							{#if titreLisible(r.titre)}<span class="titre">{@render surligne(titreLisible(r.titre))}</span>{/if}
							<span class="apercu">{@render surligne(extrait(r.texte, requete, 180))}</span>
							{#if source === 'epinglees'}<span class="edition">{r.edition}</span>{/if}
						</a>
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
					<li><a href={urlRegle(r)} class="ligne"><span class="ref">{r.reference}</span> <span class="titre">{titreLisible(r.titre) || r.texte.slice(0, 90)}</span><span class="edition">{r.edition}</span></a></li>
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
		max-width: 100%;
		overflow-x: auto;
		scrollbar-width: none;
		border-bottom: 1px solid var(--filet);
	}
	.onglets .court {
		display: none;
	}
	@media (max-width: 600px) {
		.onglets .long {
			display: none;
		}
		.onglets .court {
			display: inline;
		}
	}
	.badge {
		font-size: 12px;
		font-weight: 700;
		color: var(--doux);
		border: 1px solid var(--filet);
		border-radius: var(--r-petit);
		padding: 1px 6px;
	}
	.onglets button {
		white-space: nowrap;
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
		min-height: 44px;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	summary {
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	/* Chevron dessiné : il pivote quand la branche s'ouvre. */
	summary::before {
		content: '';
		flex: none;
		width: 7px;
		height: 7px;
		border-right: 2px solid var(--doux);
		border-bottom: 2px solid var(--doux);
		transform: rotate(-45deg);
		transition: transform var(--duree-micro) ease-out;
	}
	details[open] > summary::before {
		transform: rotate(45deg);
	}
	.ouvrir {
		font-size: 14px;
		font-weight: 600;
	}
	.resultats li {
		border-bottom: 1px solid var(--filet-doux);
	}
	/* Toute la ligne est le lien : une cible confortable au doigt. */
	.ligne {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px 10px;
		min-height: 44px;
		padding: 8px 4px;
		color: var(--encre);
		text-decoration: none;
		border-radius: var(--r-petit);
	}
	.ligne:hover {
		background: var(--ligne-survol);
	}
	.ligne:hover .ref {
		text-decoration: underline;
	}
	@media (pointer: coarse) {
		.clavier {
			display: none;
		}
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
