// Formulaire d'un examen officiel (espace formateur) : fonctions pures.

export type FormulaireExamen = {
	titre: string;
	/** Format de <input type="datetime-local"> : « 2026-11-07T09:30 ». */
	dateHeure: string;
	lieu: string;
	dureeMinutes: number | null;
	seuil: number | null;
};

/** Champ → message. Le seuil n'est comparé au nombre de questions qu'une fois des questions choisies. */
export function validerExamen(f: FormulaireExamen, nbQuestions: number): Record<string, string> {
	const e: Record<string, string> = {};
	if (!f.titre.trim()) e.titre = 'Donnez un titre à l’examen.';
	if (!f.dateHeure) e.dateHeure = 'Choisissez la date et l’heure.';
	if (!f.dureeMinutes || f.dureeMinutes < 1 || f.dureeMinutes > 240) e.dureeMinutes = 'La durée doit être comprise entre 1 et 240 minutes.';
	// Sans question choisie, le seuil peut attendre (la liste de contrôle bloque de toute façon l'ouverture).
	if (!f.seuil || f.seuil < 1) {
		if (nbQuestions > 0 || f.seuil !== null) e.seuil = 'Indiquez le seuil de réussite.';
	} else if (nbQuestions > 0 && f.seuil > nbQuestions) e.seuil = `Le seuil dépasse le nombre de questions (${nbQuestions}).`;
	return e;
}

/** Proposition par défaut : 70 % des questions, arrondi au-dessus (décision du comité encore ouverte). */
export const seuilParDefaut = (nbQuestions: number) => Math.max(1, Math.ceil(nbQuestions * 0.7));

/** Date ISO → valeur d'un <input type="datetime-local"> à l'heure locale. */
export function versChampDate(iso: string): string {
	const d = new Date(iso);
	const deux = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}T${deux(d.getHours())}:${deux(d.getMinutes())}`;
}

export const LIBELLE_STATUT = { brouillon: 'Brouillon', ouvert: 'Ouvert', clos: 'Clos' } as const;
