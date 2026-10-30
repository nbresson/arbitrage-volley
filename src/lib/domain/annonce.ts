// Annonce ciblée pour les lecteurs d'écran : seul le compteur qui vient de changer est lu (« 5 acquises »).
type Compteur = { libelle: string; valeur: number };

export function annonceCompteurs(avant: Compteur[] | null, apres: Compteur[]): string {
	if (!avant) return '';
	const precedent = new Map(avant.map((c) => [c.libelle, c.valeur]));
	return apres
		.filter((c) => !c.libelle.includes('/') && precedent.has(c.libelle) && precedent.get(c.libelle) !== c.valeur)
		.map((c) => `${c.valeur} ${c.libelle.toLowerCase()}`)
		.join(', ');
}
