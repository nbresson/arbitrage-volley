<script lang="ts">
	import Volet from './Volet.svelte';

	let {
		valeur,
		chiffres,
		libelle,
		couleur = null
	}: { valeur: number; chiffres: number; libelle: string; couleur?: 'bleu' | 'rouge' | null } = $props();

	const digits = $derived(String(Math.max(0, valeur)).padStart(chiffres, '0').split(''));
</script>

<div class="compteur">
	<div class="volets" aria-hidden="true">
		{#each digits as d, i (i)}
			<Volet chiffre={d} delai={i * 60} />
		{/each}
	</div>
	<span class="libelle" aria-hidden="true">
		{#if couleur}<span class="pastille {couleur}"></span>{/if}{libelle}
	</span>
</div>

<style>
	.compteur {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 7px;
	}
	.volets {
		display: flex;
		gap: 4px;
	}
	.libelle {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: var(--tableau-texte);
	}
	.pastille {
		width: 9px;
		height: 9px;
		border-radius: 2px;
	}
	.bleu {
		background: var(--bleu);
	}
	.rouge {
		background: var(--rouge);
	}
</style>
