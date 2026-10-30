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

/** Préremplissage depuis l'URL : ?mode=…&theme=…&theme=…&regle=…&nb=…&role=… */
export function lireParametres(url: { searchParams: Pick<URLSearchParams, 'get' | 'getAll'> }, profil: Profil): ParametresSeance {
	const q = url.searchParams;
	const type: TypeSeance = q.get('mode') === 'examen_entrainement' ? 'examen_entrainement' : 'pedagogique';
	const p = parametresParDefaut(profil, type);
	p.themeIds = q.getAll('theme');
	p.regleId = q.get('regle');
	if (p.regleId) p.niveauId = null;
	const role = q.get('role');
	if (role === 'arbitre' || role === 'marqueur') p.role = role;
	else if (role === 'tous') p.role = null;
	const nb = Number.parseInt(q.get('nb') ?? '', 10);
	if (Number.isFinite(nb)) p.nb = borner(nb, 5, 50);
	return p;
}
