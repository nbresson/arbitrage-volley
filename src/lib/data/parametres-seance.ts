import type { Profil } from '#lib/auth.ts';

export type TypeSeance = 'pedagogique' | 'examen_entrainement';

export type ParametresSeance = {
	type: TypeSeance;
	themeIds: string[];
	regleId: string | null;
	niveauId: string | null;
	role: 'arbitre' | 'marqueur' | null;
	nb: number;
	dureeMinutes: number | null;
};

const DEFAUTS: Record<TypeSeance, { nb: number; dureeMinutes: number | null }> = {
	pedagogique: { nb: 20, dureeMinutes: null },
	examen_entrainement: { nb: 30, dureeMinutes: 45 }
};

/** Examen blanc par thème : dix questions chronométrées sur un seul thème. */
export const EXAMEN_PAR_THEME = { nb: 10, dureeMinutes: 15 } as const;

/** Quand aucune question ne correspond : les filtres actifs qu'on peut lever, dans l'ordre où les proposer. */
export function elargissements(p: ParametresSeance): { libelle: string; appliquer: (p: ParametresSeance) => ParametresSeance }[] {
	return [
		p.niveauId ? { libelle: 'Tous les niveaux', appliquer: (x: ParametresSeance) => ({ ...x, niveauId: null }) } : null,
		p.themeIds.length ? { libelle: 'Tous les thèmes', appliquer: (x: ParametresSeance) => ({ ...x, themeIds: [] }) } : null,
		p.role ? { libelle: 'Arbitre et marqueur', appliquer: (x: ParametresSeance) => ({ ...x, role: null }) } : null,
		p.regleId ? { libelle: 'Retirer le filtre de règle', appliquer: (x: ParametresSeance) => ({ ...x, regleId: null }) } : null
	].filter((x) => x !== null);
}

export const borner = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function parametresParDefaut(profil: Profil, type: TypeSeance): ParametresSeance {
	return {
		type,
		themeIds: [],
		regleId: null,
		niveauId: profil.niveau_id,
		role: profil.profil_formation,
		...DEFAUTS[type]
	};
}

/** Préremplissage depuis l'URL : ?mode=…&theme=…&theme=…&regle=…&nb=…&role=…&duree=… ; ?format=theme : examen par thème. */
export function lireParametres(url: { searchParams: Pick<URLSearchParams, 'get' | 'getAll'> }, profil: Profil): ParametresSeance {
	const q = url.searchParams;
	const parTheme = q.get('format') === 'theme';
	const type: TypeSeance = parTheme || q.get('mode') === 'examen_entrainement' ? 'examen_entrainement' : 'pedagogique';
	const p = parametresParDefaut(profil, type);
	p.themeIds = q.getAll('theme');
	p.regleId = q.get('regle');
	if (p.regleId) p.niveauId = null;
	const role = q.get('role');
	if (role === 'arbitre' || role === 'marqueur') p.role = role;
	else if (role === 'tous') p.role = null;
	const nb = Number.parseInt(q.get('nb') ?? '', 10);
	if (Number.isFinite(nb)) p.nb = borner(nb, 5, 50);
	const duree = Number.parseInt(q.get('duree') ?? '', 10);
	if (type === 'examen_entrainement' && Number.isFinite(duree)) p.dureeMinutes = borner(duree, 5, 120);
	if (parTheme) Object.assign(p, EXAMEN_PAR_THEME, { themeIds: p.themeIds.slice(0, 1) });
	return p;
}
