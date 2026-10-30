<script lang="ts">
	import { titreLisible } from '#lib/domain/texte.ts';
	import EtatVide from '#lib/components/EtatVide.svelte';
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { toutesLesRegles, urlRegle } from '#lib/data/regles.ts';
	import { chercher, construireArbre, type NoeudRegle, type Regle } from '#lib/regles/arbre.ts';

	let regles = $state<Regle[]>([]);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	let source = $state<'fivb_regles' | 'casebook' | 'cfa'>('fivb_regles');
	let requete = $state('');

	$effect(() => {
		toutesLesRegles()
			.then((r) => ((regles = r), (etat = 'pret')))
			.catch(() => (etat = 'erreur'));
	});

	// L'onglet CFA n'apparaît que lorsqu'une consigne d'une édition active existe.
	const avecCfa = $derived(regles.some((r) => r.source === 'cfa'));
	const deLaSource = $derived(regles.filter((r) => r.source === source));
	const resultats = $derived(requete.trim() ? chercher(deLaSource, requete) : []);
	const arbre = $derived(construireArbre(deLaSource));
</script>

<svelte:head><title>{'Règles'} · Arbitrage volley</title></svelte:head>

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
		</div>
		<label class="champ recherche">
			Chercher un numéro ou des mots
			<input type="search" bind:value={requete} placeholder="ex. 19.3.1.4, Cas 3.35, libéro passe" />
		</label>
	</div>

	{#if etat === 'chargement'}
		<p role="status">Chargement des règles…</p>
	{:else if etat === 'erreur'}
		<p class="message-erreur" role="alert">Les règles n’ont pas pu être chargées. Vérifiez votre connexion puis rechargez la page.</p>
	{:else if requete.trim()}
		<p class="compte" role="status">{resultats.length} résultat{resultats.length > 1 ? 's' : ''}</p>
		{#if resultats.length}
			<ul class="liste">
				{#each resultats.slice(0, 100) as r (r.id)}
					<li><a href={urlRegle(r)} class="ref">{r.reference}</a> <span class="apercu">{titreLisible(r.titre) || r.texte.slice(0, 140)}</span></li>
				{/each}
			</ul>
		{:else}
			<EtatVide titre="Aucune règle ne correspond" texte="Essayez un numéro (« 12.4 ») ou d’autres mots." />
		{/if}
	{:else}
		<ul class="liste">
			{#each arbre as n (n.regle.id)}<li>{@render noeud(n)}</li>{/each}
		</ul>
	{/if}
</main>

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
	.compte {
		margin: 0;
		color: var(--doux);
	}
</style>
