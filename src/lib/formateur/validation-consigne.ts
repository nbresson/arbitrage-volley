// Formulaire d'une consigne CFA (espace formateur) : fonction pure.

export type FormulaireConsigne = { reference: string; titre: string; texte: string };

const cle = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Champ → message. `referencesExistantes` : les autres consignes de la même édition. */
export function validerConsigne(f: FormulaireConsigne, referencesExistantes: string[]): Record<string, string> {
	const e: Record<string, string> = {};
	if (!f.reference.trim()) e.reference = 'Indiquez la référence.';
	else if (referencesExistantes.some((r) => cle(r) === cle(f.reference))) e.reference = 'Cette référence existe déjà dans cette édition.';
	if (!f.texte.trim()) e.texte = 'Rédigez le texte de la consigne.';
	return e;
}
