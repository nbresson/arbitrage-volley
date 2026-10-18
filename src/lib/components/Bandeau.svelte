<script lang="ts">
	import type { Snippet } from 'svelte';
	import Compteur from './Compteur.svelte';

	type DefCompteur = { valeur: number; chiffres: number; libelle: string; couleur?: 'bleu' | 'rouge' | null };

	let {
		titre,
		sousTitre,
		compteurs = [],
		resumeTexte = '',
		navigation,
		action
	}: {
		titre: string;
		sousTitre: string;
		compteurs?: DefCompteur[];
		resumeTexte?: string;
		navigation?: Snippet;
		action?: Snippet;
	} = $props();
</script>

<header class="bandeau">
	<div class="marque">
		{titre}<span>{sousTitre}</span>
	</div>
	{#if compteurs.length}
		<div class="compteurs" role="group" aria-label={resumeTexte}>
			{#each compteurs as c (c.libelle)}
				<Compteur {...c} />
			{/each}
		</div>
		<span class="resume">{resumeTexte}</span>
	{/if}
	<div class="droite">
		{#if navigation}<nav class="nav" aria-label="Navigation principale">{@render navigation()}</nav>{/if}
		{#if action}{@render action()}{/if}
	</div>
</header>

<style>
	.bandeau {
		background: var(--tableau);
		color: var(--papier);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px 32px;
		padding: 22px 40px;
		border-bottom: 6px solid var(--papier);
	}
	.bandeau :global(:focus-visible) {
		outline-color: var(--papier);
	}
	.marque {
		flex: 1 1 220px;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 26px;
		line-height: 1;
	}
	.marque span {
		display: block;
		font-family: var(--police);
		font-weight: 500;
		font-size: 13px;
		color: var(--tableau-texte-doux);
		margin-top: 6px;
	}
	.compteurs {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
	}
	.resume {
		display: none;
		font-size: 15px;
		font-weight: 600;
	}
	.droite {
		flex: 1 1 220px;
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: center;
		gap: 8px;
	}
	.nav {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.nav :global(a) {
		color: var(--tableau-texte);
		text-decoration: none;
		font-weight: 600;
		font-size: 15px;
		padding: 12px 14px;
		border-radius: var(--r);
	}
	.nav :global(a:hover) {
		background: var(--volet);
		color: var(--papier);
	}
	.nav :global(a[aria-current='page']) {
		background: var(--papier);
		color: var(--tableau);
	}
	@media (max-width: 900px) {
		.bandeau {
			padding: 16px 20px;
		}
		.nav :global(a) {
			padding: 10px;
			font-size: 14px;
		}
	}
	@media (max-width: 600px) {
		.compteurs {
			display: none;
		}
		.resume {
			display: block;
		}
	}
</style>
