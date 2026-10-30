<script lang="ts">
	// État vide illustré : un ballon posé au pied du filet, un titre, une phrase utile et, si possible, l'action à faire.
	import type { Snippet } from 'svelte';

	let { titre, texte = '', action, niveau = 2 }: { titre: string; texte?: string; action?: Snippet; niveau?: 2 | 3 } = $props();
</script>

<div class="vide">
	<svg width="120" height="78" viewBox="0 0 120 78" fill="none" aria-hidden="true">
		<path d="M4 74h112" stroke="var(--filet)" stroke-width="2" stroke-linecap="round" />
		<path d="M60 8v66" stroke="var(--doux)" stroke-width="2.5" stroke-linecap="round" />
		<path d="M60 12h40M60 40h40" stroke="var(--trait)" stroke-width="2" />
		<path d="M66 12v28M72 12v28M78 12v28M84 12v28M90 12v28M96 12v28M60 19h40M60 26h40M60 33h40" stroke="var(--filet)" stroke-width="1" />
		<path d="M100 8v66" stroke="var(--doux)" stroke-width="2.5" stroke-linecap="round" />
		<circle cx="34" cy="61" r="12" fill="var(--papier)" stroke="var(--trait)" stroke-width="2" />
		<path d="M34 49c-3 4-3 8 0 12s3 8 0 12M22.5 57c4 1 8 1 11.5 4s7.5 3 11.5 3" stroke="var(--trait)" stroke-width="1.6" stroke-linecap="round" />
	</svg>
	<svelte:element this={`h${niveau}`} class="titre">{titre}</svelte:element>
	{#if texte}<p>{texte}</p>{/if}
	{#if action}<div class="action">{@render action()}</div>{/if}
</div>

<style>
	.vide {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 8px;
		padding: 28px 20px;
		background: var(--papier);
		border: 1px dashed var(--filet);
		border-radius: var(--r);
	}
	svg {
		margin-bottom: 6px;
	}
	.titre {
		margin: 0;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 22px;
	}
	p {
		margin: 0;
		max-width: 34em;
		color: var(--doux);
		line-height: 1.5;
	}
	.action {
		margin-top: 8px;
	}
</style>
