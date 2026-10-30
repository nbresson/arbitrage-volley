// Raccourcis clavier d'une séance pédagogique : A à D (ou 1 à 4) pour choisir, Entrée pour valider, S pour la suivante.
export type ActionTouche = { type: 'choisir'; index: number } | { type: 'valider' } | { type: 'suivante' };

export function actionTouche(
	touche: string,
	q: { nbPropositions: number; corrigee: boolean; choix: boolean }
): ActionTouche | null {
	if (q.corrigee) return touche.toLowerCase() === 's' ? { type: 'suivante' } : null;
	if (touche === 'Enter') return q.choix ? { type: 'valider' } : null;
	const lettre = 'abcd'.indexOf(touche.toLowerCase());
	const chiffre = '1234'.indexOf(touche);
	const index = touche.length === 1 ? Math.max(lettre, chiffre) : -1;
	return index >= 0 && index < q.nbPropositions ? { type: 'choisir', index } : null;
}

/** Balayage vers la gauche (au moins 70 px, plus horizontal que vertical) : passer à la question suivante. */
export const estBalayageGauche = (dx: number, dy: number) => dx <= -70 && Math.abs(dy) < Math.abs(dx) / 2;
