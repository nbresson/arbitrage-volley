// Courbe de réussite de chaque stagiaire : taux de bonnes réponses de ses 5 dernières séances pédagogiques.
export type SeanceReponses = { stagiaire_id: string; debut: string; reponses: { correcte: boolean | null }[] };

/** Par stagiaire, les taux (0 à 100) de la plus ancienne à la plus récente des 5 dernières séances avec réponses. */
export function courbesReussite(seances: SeanceReponses[], n = 5): Map<string, number[]> {
	const parStagiaire = new Map<string, number[]>();
	const triees = [...seances].sort((a, b) => b.debut.localeCompare(a.debut));
	for (const s of triees) {
		const comptees = s.reponses.filter((r) => r.correcte !== null);
		if (!comptees.length) continue;
		const taux = parStagiaire.get(s.stagiaire_id) ?? [];
		if (taux.length >= n) continue;
		taux.push(Math.round((comptees.filter((r) => r.correcte).length / comptees.length) * 100));
		parStagiaire.set(s.stagiaire_id, taux);
	}
	for (const [id, taux] of parStagiaire) parStagiaire.set(id, taux.reverse());
	return parStagiaire;
}

/** Moyenne arrondie des taux (réussite affichée et triée dans la liste des stagiaires) ; null sans valeur. */
export const moyenne = (valeurs: number[]): number | null =>
	valeurs.length ? Math.round(valeurs.reduce((s, v) => s + v, 0) / valeurs.length) : null;
