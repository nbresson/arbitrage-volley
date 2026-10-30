// Préférences personnelles, gardées dans ce navigateur (confort, sans garantie).
export type Preferences = {
	objectifSemaine: number; // séances par semaine
	triThemes: 'reglement' | 'faibles' | 'alpha';
	filtreRole: 'arbitre' | 'marqueur' | null;
	derniereVisite: string | null; // ISO
};

const DEFAUTS: Preferences = { objectifSemaine: 3, triThemes: 'reglement', filtreRole: null, derniereVisite: null };
const CLE = 'preferences';

export function lirePreferences(): Preferences {
	try {
		return { ...DEFAUTS, ...JSON.parse(localStorage.getItem(CLE) ?? '{}') };
	} catch {
		return { ...DEFAUTS };
	}
}

export function enregistrerPreferences(partie: Partial<Preferences>): Preferences {
	const p = { ...lirePreferences(), ...partie };
	try {
		localStorage.setItem(CLE, JSON.stringify(p));
	} catch {
		/* stockage indisponible : la préférence vaut pour cette page */
	}
	return p;
}
