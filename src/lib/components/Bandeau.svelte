<script lang="ts">
	import type { Snippet } from 'svelte';
	import { seDeconnecter, session } from '#lib/session.svelte.ts';
	import Compteur from './Compteur.svelte';
	import Icone from './Icone.svelte';

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

	const profil = $derived(session.profil);
	const initiales = $derived(profil ? `${profil.prenom.charAt(0)}${profil.nom.charAt(0)}`.toUpperCase() : '');
	let menu = $state<HTMLDetailsElement>();

	// Le menu du compte se referme quand on clique ailleurs.
	function fermerSiDehors(e: MouseEvent) {
		if (menu?.open && !menu.contains(e.target as Node)) menu.open = false;
	}
</script>

<svelte:window onclick={fermerSiDehors} />

<header class="bandeau" class:avec-compteurs={compteurs.length > 0} class:avec-compte={!!profil}>
	<div class="marque">
		{titre}<span>{sousTitre}</span>
	</div>
	{#if compteurs.length}
		<!-- Les volets sont visuels ; le résumé écrit est lu par les lecteurs d'écran (et affiché sur mobile). -->
		<div class="compteurs" aria-hidden="true">
			{#each compteurs as c (c.libelle)}
				<Compteur {...c} />
			{/each}
		</div>
		<p class="resume" role="status">{resumeTexte}</p>
	{/if}
	<div class="droite">
		{#if navigation}<nav class="nav" aria-label="Navigation principale">{@render navigation()}</nav>{/if}
		{#if action}{@render action()}{/if}
	</div>
	{#if profil}
		<details class="compte" bind:this={menu}>
			<summary aria-label="Mon compte">{initiales}</summary>
			<div class="menu">
				<p class="nom">{profil.prenom} {profil.nom}</p>
				<p class="role">{profil.role === 'formateur' ? 'Formateur' : 'Stagiaire'} · {profil.profil_formation}</p>
				<button type="button" onclick={seDeconnecter}><Icone nom="sortie" taille={18} />Se déconnecter</button>
			</div>
		</details>
	{/if}
</header>

<style>
	.bandeau {
		position: relative;
		background: var(--tableau);
		color: var(--papier);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px 32px;
		padding: 22px 40px;
		border-bottom: 6px solid var(--papier);
	}
	/* Les lignes du terrain en filigrane : contour, lignes des 3 m et ligne centrale (pointillée). */
	.bandeau.avec-compteurs::before {
		content: '';
		position: absolute;
		top: 12px;
		bottom: 12px;
		left: 50%;
		width: min(620px, 64%);
		transform: translateX(-50%);
		border: 2px solid rgb(255 255 255 / 0.04);
		background:
			linear-gradient(rgb(255 255 255 / 0.07) 50%, transparent 0) center / 2px 12px repeat-y,
			linear-gradient(90deg, transparent calc(33.3% - 1px), rgb(255 255 255 / 0.04) 0 calc(33.3% + 1px), transparent 0 calc(66.6% - 1px), rgb(255 255 255 / 0.04) 0 calc(66.6% + 1px), transparent 0);
		pointer-events: none;
	}
	.bandeau > * {
		position: relative;
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
		position: absolute;
		width: 1px;
		height: 1px;
		margin: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
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
		display: inline-flex;
		align-items: center;
		gap: 8px;
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
	.compte {
		position: relative;
		margin-left: -24px;
	}
	.compte summary {
		list-style: none;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 2px solid var(--volet-bord);
		background: var(--volet);
		display: grid;
		place-items: center;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 17px;
		cursor: pointer;
		transition: border-color var(--duree-micro) ease-out;
	}
	.compte summary::-webkit-details-marker {
		display: none;
	}
	.compte summary:hover,
	.compte[open] summary {
		border-color: var(--papier);
	}
	.menu {
		position: absolute;
		right: 0;
		top: calc(100% + 8px);
		z-index: 10;
		min-width: 230px;
		background: var(--papier);
		color: var(--encre);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.menu p {
		margin: 0;
	}
	.nom {
		font-weight: 700;
	}
	.menu .role {
		font-size: 13px;
		color: var(--doux);
		margin-bottom: 8px;
	}
	.menu button {
		display: flex;
		align-items: center;
		gap: 8px;
		font: inherit;
		font-weight: 600;
		padding: 10px 8px;
		border: 0;
		border-top: 1px solid var(--filet-doux);
		background: none;
		color: var(--encre);
		cursor: pointer;
		text-align: left;
	}
	.menu button:hover {
		background: var(--ligne-survol);
	}
	.menu :global(:focus-visible) {
		outline-color: var(--bleu);
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
			position: static;
			width: auto;
			height: auto;
			overflow: visible;
			clip-path: none;
			white-space: normal;
		}
		/* Le rond du compte reste en haut à droite au lieu de tomber seul sur une ligne. */
		.avec-compte {
			padding-right: 76px;
		}
		.compte {
			position: absolute;
			top: 16px;
			right: 20px;
			margin: 0;
		}
	}
</style>
