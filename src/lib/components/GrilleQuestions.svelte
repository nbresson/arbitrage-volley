<script lang="ts">
	let {
		total,
		courant,
		repondues,
		signalees,
		onaller
	}: { total: number; courant: number; repondues: Set<number>; signalees: Set<number>; onaller: (n: number) => void } = $props();

	const cases = $derived(
		Array.from({ length: total }, (_, i) => {
			const n = i + 1;
			const rep = repondues.has(n), sig = signalees.has(n), cur = n === courant;
			return {
				n,
				rep,
				sig,
				cur,
				aria: `Question ${n}, ${cur ? 'en cours' : rep ? 'répondue' : 'sans réponse'}${sig ? ', à vérifier' : ''}`
			};
		})
	);
</script>

<nav aria-label="Aller à une question" class="grille">
	{#each cases as c (c.n)}
		<button class="case" class:rep={c.rep} class:cur={c.cur} aria-label={c.aria} aria-current={c.cur ? 'step' : undefined} onclick={() => onaller(c.n)}>
			{c.n}
			{#if c.sig}
				<svg class="drapeau" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 22V3h12l-2.5 4.5L17 12H7v10z" /></svg>
			{/if}
		</button>
	{/each}
</nav>
<div class="legende">
	<span><i class="pastille rep"></i>Répondue</span>
	<span><i class="pastille cur"></i>En cours</span>
	<span><svg width="12" height="12" viewBox="0 0 24 24" fill="var(--ambre)" aria-hidden="true"><path d="M5 22V3h12l-2.5 4.5L17 12H7v10z" /></svg>À vérifier</span>
</div>

<style>
	.grille {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 6px;
	}
	.case {
		position: relative;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 16px;
		font-variant-numeric: tabular-nums;
		height: 40px;
		border-radius: var(--r-petit);
		border: 1.5px solid var(--filet);
		background: var(--papier);
		color: var(--doux);
		cursor: pointer;
		padding: 0;
	}
	.case:hover {
		border-color: var(--doux);
	}
	.rep {
		background: var(--tableau);
		border-color: var(--trait);
		color: var(--sur-fonce);
	}
	.cur {
		border: 2px solid var(--bleu);
		color: var(--bleu-texte);
		background: var(--bleu-clair);
	}
	.drapeau {
		position: absolute;
		top: 3px;
		right: 3px;
		color: var(--ambre);
	}
	.rep .drapeau {
		color: var(--ambre-vif);
	}
	.legende {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		font-size: 13px;
		color: var(--doux);
	}
	.legende span {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.pastille {
		width: 12px;
		height: 12px;
		border-radius: 2px;
	}
	.pastille.rep {
		background: var(--tableau);
	}
	.pastille.cur {
		border: 2px solid var(--bleu);
		background: var(--bleu-clair);
	}
</style>
