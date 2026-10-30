<script lang="ts">
	// Fenêtre « Raccourcis clavier », ouverte par la touche « ? ». Échap la ferme (comportement natif de <dialog>).
	import { RACCOURCIS } from '#lib/raccourcis-globaux.ts';

	let { ouvert = $bindable(false) }: { ouvert?: boolean } = $props();
	let dialogue = $state<HTMLDialogElement>();

	$effect(() => {
		if (!dialogue) return;
		if (ouvert && !dialogue.open) dialogue.showModal?.();
		if (!ouvert && dialogue.open) dialogue.close();
	});
</script>

<dialog bind:this={dialogue} aria-labelledby="titre-raccourcis" onclose={() => (ouvert = false)}>
	<h2 id="titre-raccourcis">Raccourcis clavier</h2>
	{#each RACCOURCIS as g (g.groupe)}
		<h3>{g.groupe}</h3>
		<dl>
			{#each g.raccourcis as r (r.touches)}<dt><kbd>{r.touches}</kbd></dt><dd>{r.action}</dd>{/each}
		</dl>
	{/each}
	<div class="pied">
		<a href="/aide" onclick={() => (ouvert = false)}>Toute l’aide</a>
		<button type="button" class="btn" onclick={() => (ouvert = false)}>Fermer</button>
	</div>
</dialog>

<style>
	dialog {
		max-width: min(480px, calc(100vw - 32px));
		width: 100%;
		border: 1px solid var(--filet);
		border-radius: var(--r);
		background: var(--papier);
		color: var(--encre);
		padding: 24px;
	}
	dialog::backdrop {
		background: rgb(28 36 48 / 0.6);
	}
	h2 {
		margin: 0 0 8px;
		font-size: 22px;
	}
	h3 {
		margin: 14px 0 8px;
		font-size: 15px;
		color: var(--doux);
	}
	dl {
		margin: 0;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 8px 14px;
		align-items: center;
	}
	dd {
		margin: 0;
	}
	kbd {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 14px;
		border: 1.5px solid var(--filet);
		border-bottom-width: 3px;
		border-radius: var(--r-petit);
		padding: 2px 8px;
		white-space: nowrap;
	}
	.pied {
		margin-top: 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
</style>
