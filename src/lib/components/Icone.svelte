<script module lang="ts">
	// Jeu d'icônes « salle de sport » : trait de 1,75 px, bouts arrondis, grille de 24 px.
	// Toujours décoratives : chaque icône accompagne un libellé écrit, elle ne le remplace pas.
	const TRACES = {
		accueil: ['M3 11 12 4l9 7', 'M5 10v10h14V10'],
		ballon: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 3c-2 3-2 6 0 9s2 6 0 9', 'M3.5 9c3 1 6 1 8.5 3s5.5 2 8.5 3'],
		sifflet: ['M5 9h7a3 3 0 1 1 0 6H9', 'M6.5 12.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z', 'M15 6l2-2M18 9h3M17 12l2 1'],
		regles: ['M5 4h11l3 3v13H5z', 'M9 10h6M9 14h6M9 18h3'],
		chrono: ['M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M12 9v4l3 2M9 2h6'],
		stagiaires: ['M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', 'M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6', 'M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5c1.8.9 3 2.9 3 5.5'],
		questions: ['M4 5h16v11H9l-5 4z', 'M10 9a2 2 0 1 1 2.5 1.9c-.3.1-.5.4-.5.7v.4', 'M12 14h.01'],
		filet: ['M3 6h18M3 14h18', 'M6 6v8M10 6v8M14 6v8M18 6v8', 'M3 4v17M21 4v17'],
		terrain: ['M3 4h18v16H3z', 'M12 4v16M9 4v16M15 4v16'],
		crayon: ['M4 20l4-1 11-11-3-3L5 16z'],
		coche: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M8 12l3 3 5-6'],
		archive: ['M3 4h18v5H3z', 'M5 9v11h14V9M10 13h4'],
		cadenas: ['M5 11h14v9H5z', 'M8 11V8a4 4 0 0 1 8 0v3'],
		calendrier: ['M4 5h16v15H4z', 'M4 10h16M9 3v4M15 3v4'],
		lieu: ['M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z', 'M12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z'],
		fleche: ['M5 12h14M13 6l6 6-6 6'],
		retour: ['M19 12H5M11 6l-6 6 6 6'],
		sortie: ['M10 4H5v16h5', 'M14 8l4 4-4 4M18 12H9']
	} as const;

	export type NomIcone = keyof typeof TRACES;
	export const NOMS_ICONES = Object.keys(TRACES) as NomIcone[];
</script>

<script lang="ts">
	let { nom, taille = 20 }: { nom: NomIcone; taille?: number } = $props();
</script>

<svg
	class="icone"
	width={taille}
	height={taille}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
>
	{#each TRACES[nom] as d (d)}<path {d} />{/each}
</svg>

<style>
	.icone {
		flex: none;
		display: block;
	}
</style>
