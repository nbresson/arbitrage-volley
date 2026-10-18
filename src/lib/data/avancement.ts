// Avancement d'un stagiaire en mode pédagogique (fonction SQL « avancement »), mis en forme pour l'accueil.

export type Avancement = {
	theme_id: string;
	theme: string;
	ordre: number;
	total: number; // questions validées d'entraînement du thème
	acquises: number;
	a_revoir: number;
};

export type LigneTheme = { themeId: string; theme: string; acquises: number; aRevoir: number; total: number; commence: boolean };

export function lignesThemes(av: Avancement[]): LigneTheme[] {
	return [...av]
		.filter((a) => a.total > 0)
		.sort((a, b) => a.ordre - b.ordre)
		.map((a) => ({
			themeId: a.theme_id,
			theme: a.theme,
			acquises: a.acquises,
			aRevoir: a.a_revoir,
			total: a.total,
			commence: a.acquises + a.a_revoir > 0
		}));
}

export function totaux(av: Avancement[]) {
	const acquises = av.reduce((s, a) => s + a.acquises, 0);
	const aRevoir = av.reduce((s, a) => s + a.a_revoir, 0);
	return { travaillees: acquises + aRevoir, acquises, aRevoir };
}
