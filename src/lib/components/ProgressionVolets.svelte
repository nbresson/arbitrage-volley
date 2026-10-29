<script lang="ts">
	// Progression d'un thème en 10 petits volets : bleu = acquises, rouge = à revoir.
	// Décorative : les nombres sont écrits à côté (tableau de l'accueil).
	import { casesProgression } from '#lib/domain/progression.ts';

	let { acquises, aRevoir, total }: { acquises: number; aRevoir: number; total: number } = $props();
	const cases = $derived(casesProgression(acquises, aRevoir, total));
</script>

<span class="volets" aria-hidden="true">
	{#each cases as c, i (i)}<span class="case {c}"></span>{/each}
</span>

<style>
	.volets {
		display: flex;
		gap: 3px;
		min-width: 150px;
	}
	.case {
		position: relative;
		flex: 1;
		height: 18px;
		border-radius: 3px;
		background: var(--filet-doux);
	}
	/* La ligne de pli des volets du tableau de marque. */
	.case::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: calc(50% - 0.5px);
		height: 1px;
		background: rgb(0 0 0 / 0.18);
	}
	.acquise {
		background: var(--bleu);
	}
	.a_revoir {
		background: var(--rouge);
	}
</style>
