<script lang="ts">
	import CartonsSanction from '#lib/components/CartonsSanction.svelte';
	import { urlRegle } from '#lib/data/regles.ts';
	import { surlignerPassage } from '#lib/seance/affichage.ts';
	import type { SourceCitee } from '#lib/seance/pedagogique.ts';

	let { sources }: { sources: SourceCitee[] } = $props();

	const ONGLETS = [
		{ id: 'fivb_regles', libelle: 'Règles FIVB' },
		{ id: 'casebook', libelle: 'Casebook' },
		{ id: 'cfa', libelle: 'Consignes CFA' }
	] as const;

	// Un onglet n'apparaît que si au moins une source de ce type est liée à la question.
	const presents = $derived(ONGLETS.filter((o) => sources.some((s) => s.source === o.id)));
	let choisi = $state<string | null>(null);
	const actif = $derived(choisi && presents.some((o) => o.id === choisi) ? choisi : (presents[0]?.id ?? null));
	const visibles = $derived(
		sources.filter((s) => s.source === actif).sort((a, b) => Number(b.principale) - Number(a.principale))
	);
</script>

{#if presents.length}
	<div class="sources">
		<div role="tablist" aria-label="Sources" class="onglets">
			{#each presents as o (o.id)}
				<button role="tab" aria-selected={actif === o.id} onclick={() => (choisi = o.id)}>{o.libelle}</button>
			{/each}
		</div>
		<div role="tabpanel" class="contenu papier-reglement">
			{#each visibles as s (s.edition + s.reference)}
				<div class="source">
					<a href={urlRegle(s)} class="ref plaque">{s.reference}</a>
					<div class="ou">{s.edition}</div>
					<blockquote class="extrait-reglement">« {#each surlignerPassage(s.texte.trim(), s.passage) as seg, i (i)}{#if seg.surligne}<mark>{seg.texte}</mark>{:else}{seg.texte}{/if}{/each} »</blockquote>
					<div class="sanctions"><CartonsSanction texte={s.texte} /></div>
					{#if s.source === 'casebook'}
						<p class="mention">Traduction française non officielle : le texte anglais du Casebook fait foi.</p>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.sources {
		border: 1px solid var(--filet);
		border-radius: var(--r);
	}
	.onglets {
		display: flex;
		flex-wrap: wrap;
		border-bottom: 1px solid var(--filet);
	}
	.onglets button {
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		padding: 11px 16px;
		border: 0;
		background: transparent;
		color: var(--doux);
		cursor: pointer;
	}
	.onglets button:hover {
		color: var(--encre);
	}
	.onglets button[aria-selected='true'] {
		color: var(--encre);
		box-shadow: inset 0 -3px 0 var(--bleu);
	}
	.contenu {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		font-size: 15px;
		line-height: 1.6;
	}
	.ref {
		font-size: 20px;
	}
	.ou {
		font-size: 13px;
		color: var(--doux);
		margin-bottom: 6px;
	}
	p {
		margin: 0;
		white-space: pre-line;
	}
	.sanctions:not(:empty) {
		margin-top: 10px;
	}
	mark {
		background: var(--ambre-clair);
		color: inherit;
		box-shadow: inset 0 -2px 0 var(--ambre-vif);
		border-radius: 2px;
	}
	.mention {
		margin-top: 8px;
		font-size: 13px;
		color: var(--ambre);
	}
</style>
