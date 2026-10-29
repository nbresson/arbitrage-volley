// Petites règles d'écriture française pour l'affichage.

/** « 1 acquise », « 2 acquises » : en français, 0 et 1 prennent le singulier. */
export const pluriel = (n: number, singulier: string, forme = `${singulier}s`) => `${n} ${n > 1 ? forme : singulier}`;

const SIGLES = new Set(['FIVB', 'CFA', 'CEV', 'FFVB', 'VCS']);

/** Les titres des sources officielles sont parfois tout en capitales : on les remet en casse de phrase (sigles conservés). */
export function titreLisible(titre: string | null | undefined): string {
	if (!titre) return '';
	const lettres = titre.replace(/[^\p{L}]/gu, '');
	if (lettres.length < 2 || titre !== titre.toLocaleUpperCase('fr')) return titre;
	const bas = titre
		.toLocaleLowerCase('fr')
		.replace(/\p{L}+/gu, (mot) => (SIGLES.has(mot.toLocaleUpperCase('fr')) ? mot.toLocaleUpperCase('fr') : mot));
	return bas.charAt(0).toLocaleUpperCase('fr') + bas.slice(1);
}
