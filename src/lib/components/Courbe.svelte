<script lang="ts">
	// Mini-courbe de réussite (0 à 100 %), décrite en toutes lettres pour les lecteurs d'écran.
	let { valeurs }: { valeurs: number[] } = $props();

	const L = 96;
	const H = 28;
	const points = $derived(
		valeurs.map((v, i) => ({
			x: valeurs.length === 1 ? L / 2 : 4 + (i * (L - 8)) / (valeurs.length - 1),
			y: 4 + ((100 - v) * (H - 8)) / 100
		}))
	);
	const description = $derived(
		`Réussite des ${valeurs.length} dernière${valeurs.length > 1 ? 's' : ''} séance${valeurs.length > 1 ? 's' : ''} : ${valeurs.map((v) => `${v} %`).join(', ')}`
	);
</script>

{#if valeurs.length}
	<span class="courbe">
		<svg width={L} height={H} viewBox="0 0 {L} {H}" role="img" aria-label={description}>
			<line x1="0" x2={L} y1={H / 2} y2={H / 2} stroke="var(--filet-doux)" stroke-dasharray="3 3" />
			<polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--trait)" stroke-width="1.75" stroke-linejoin="round" />
			{#each points as p, i (i)}<circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 3 : 2} fill="var(--trait)" />{/each}
		</svg>
		<span class="dernier">{valeurs[valeurs.length - 1]} %</span>
	</span>
{:else}
	<span class="aucune">Aucune séance</span>
{/if}

<style>
	.courbe {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.dernier {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 16px;
		font-variant-numeric: tabular-nums;
	}
	.aucune {
		font-size: 13px;
		color: var(--doux);
	}
</style>
