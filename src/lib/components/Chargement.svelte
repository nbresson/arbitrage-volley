<script lang="ts">
	// Squelette de chargement : des formes grises à la place du contenu attendu.
	let { lignes = 3 }: { lignes?: number } = $props();
</script>

<div class="chargement" role="status">
	<span class="vh">Chargement…</span>
	{#each Array.from({ length: lignes }, (_, i) => i) as i (i)}
		<span class="forme" aria-hidden="true" style="width: {100 - (i % 3) * 12}%"></span>
	{/each}
</div>

<style>
	.chargement {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.forme {
		display: block;
		height: 48px;
		border-radius: var(--r);
		background: linear-gradient(90deg, var(--filet-doux) 0 40%, var(--ligne-survol) 50%, var(--filet-doux) 60% 100%) 0 0 / 300% 100%;
		animation: reflet 1.4s ease-in-out infinite;
	}
	@keyframes reflet {
		from {
			background-position: 100% 0;
		}
		to {
			background-position: 0 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.forme {
			animation: none;
		}
	}
</style>
