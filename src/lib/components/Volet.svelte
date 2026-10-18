<script lang="ts">
	// Un volet de tableau de marque : un chiffre, une ligne de pli, une rotation quand il change.
	let { chiffre, total = false, taille = 'normal' }: { chiffre: string; total?: boolean; taille?: 'normal' | 'grand' } =
		$props();

	let tourne = $state(false);
	let precedent: string | undefined;

	const mouvementReduit = () =>
		typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

	$effect.pre(() => {
		if (precedent === undefined) {
			precedent = chiffre;
			return;
		}
		if (chiffre !== precedent) {
			precedent = chiffre;
			tourne = !mouvementReduit();
		}
	});
</script>

<span class="volet" class:tourne class:total class:grand={taille === 'grand'} onanimationend={() => (tourne = false)}
	>{chiffre}</span
>

<style>
	.volet {
		position: relative;
		width: 46px;
		height: 64px;
		background: var(--volet);
		border-radius: var(--r-petit);
		display: grid;
		place-items: center;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 50px;
		font-variant-numeric: tabular-nums;
		color: var(--papier);
		transform-origin: 50% 0;
	}
	.volet::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: calc(50% - 1px);
		height: 2px;
		background: var(--tableau);
	}
	.total {
		background: var(--tableau);
		border: 1.5px solid var(--volet-bord);
	}
	.grand {
		width: 62px;
		height: 86px;
		font-size: 68px;
	}
	.tourne {
		animation: tourner var(--duree-volet) var(--courbe-volet) both;
	}
	@keyframes tourner {
		from {
			transform: perspective(320px) rotateX(-90deg);
		}
		to {
			transform: perspective(320px) rotateX(0deg);
		}
	}
	@media (max-width: 900px) {
		.volet {
			width: 32px;
			height: 44px;
			font-size: 34px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.tourne {
			animation: none;
		}
	}
</style>
