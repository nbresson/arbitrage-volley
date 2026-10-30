<script lang="ts">
	// Bouton discret « Retour en haut », visible après un long défilement (listes de règles, banque de questions).
	import { animationsReduites } from '#lib/preferences.ts';

	let visible = $state(false);

	function remonter() {
		window.scrollTo({ top: 0, behavior: animationsReduites() ? 'auto' : 'smooth' });
		document.querySelector<HTMLElement>('main h1, main')?.focus?.({ preventScroll: true });
	}
</script>

<svelte:window onscroll={() => (visible = window.scrollY > 900)} />

{#if visible}
	<button type="button" class="haut" onclick={remonter}>
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
		Retour en haut
	</button>
{/if}

<style>
	.haut {
		position: fixed;
		right: max(16px, env(safe-area-inset-right));
		bottom: max(16px, env(safe-area-inset-bottom));
		z-index: 20;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		padding: 0 14px;
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		color: var(--sur-fonce);
		background: var(--tableau);
		border: 1.5px solid var(--tableau);
		border-radius: 22px;
		cursor: pointer;
	}
	.haut:hover {
		background: var(--tableau-survol);
	}
</style>
