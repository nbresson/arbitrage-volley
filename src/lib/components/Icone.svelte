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
		sortie: ['M10 4H5v16h5', 'M14 8l4 4-4 4M18 12H9'],
		// Pictogrammes de thème
		service: ['M7 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M9 15c2-5 5-8 10-10', 'M15 4h4v4'],
		rotation: ['M4 12a8 8 0 0 1 14-5.3L20 9', 'M20 4v5h-5', 'M20 12a8 8 0 0 1-14 5.3L4 15', 'M4 20v-5h5'],
		remplacement: ['M5 8h12l-3-3M19 16H7l3 3'],
		'temps-mort': ['M5 5h14', 'M12 5v15'],
		carton: ['M8 3.5l9-1.5 2 13-9 1.5z', 'M4 21h10'],
		maillot: ['M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3', 'M8 3c1 2 2.5 3 4 3s3-1 4-3'],
		ecran: ['M3 5h18v11H3z', 'M8 20h8M12 16v4'],
		blessure: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 8v8M8 12h8'],
		capitaine: ['M5 5h14v14H5z', 'M15 9.5a3.5 3.5 0 1 0 0 5'],
		entraineur: ['M7 4h10v17H7z', 'M10 4V2.5h4V4', 'M10 10l2 2 3-3M10 16h4'],
		contre: ['M7 21V9a1.5 1.5 0 0 1 3 0v4', 'M10 12V6.5a1.5 1.5 0 0 1 3 0V12', 'M13 12V8a1.5 1.5 0 0 1 3 0v6c0 4-2 7-6 7H7'],
		attaque: ['M18 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z','M4 20l9-9', 'M13 11l-2-5M13 11l5 2'],
		interdit: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M5.6 5.6l12.8 12.8']
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
