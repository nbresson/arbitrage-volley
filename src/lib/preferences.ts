// Préférences personnelles, gardées dans ce navigateur (confort, sans garantie).
export type Preferences = {
	objectifSemaine: number; // séances par semaine
	triThemes: 'reglement' | 'faibles' | 'alpha';
	filtreRole: 'arbitre' | 'marqueur' | null;
	derniereVisite: string | null; // ISO
	minuteurQuestion: boolean; // 30 s conseillées par question en séance
	theme: 'auto' | 'clair' | 'sombre';
	taille: 'normale' | 'grande' | 'tres-grande';
	animations: 'systeme' | 'reduites';
	contraste: 'normal' | 'eleve';
};

const DEFAUTS: Preferences = {
	objectifSemaine: 3,
	triThemes: 'reglement',
	filtreRole: null,
	derniereVisite: null,
	minuteurQuestion: false,
	theme: 'auto',
	taille: 'normale',
	animations: 'systeme',
	contraste: 'normal'
};
export const CLE_PREFERENCES = 'preferences';

export function lirePreferences(): Preferences {
	try {
		return { ...DEFAUTS, ...JSON.parse(localStorage.getItem(CLE_PREFERENCES) ?? '{}') };
	} catch {
		return { ...DEFAUTS };
	}
}

export function enregistrerPreferences(partie: Partial<Preferences>): Preferences {
	const p = { ...lirePreferences(), ...partie };
	try {
		localStorage.setItem(CLE_PREFERENCES, JSON.stringify(p));
	} catch {
		/* stockage indisponible : la préférence vaut pour cette page */
	}
	return p;
}

/**
 * Thème, taille du texte, animations et contraste deviennent des attributs de <html>, lus par la feuille de style.
 * La valeur par défaut n'en pose aucun. (La même logique, recopiée dans src/app.html, s'applique avant le premier affichage.)
 */
export function appliquerAffichage(p: Preferences, racine: HTMLElement = document.documentElement) {
	const attributs: Record<string, string | null> = {
		theme: p.theme === 'auto' ? null : p.theme,
		taille: p.taille === 'normale' ? null : p.taille,
		animations: p.animations === 'systeme' ? null : p.animations,
		contraste: p.contraste === 'normal' ? null : p.contraste
	};
	for (const [cle, valeur] of Object.entries(attributs)) {
		if (valeur) racine.dataset[cle] = valeur;
		else delete racine.dataset[cle];
	}
}

/** Animations réduites : choisies dans les préférences, ou demandées par le système. */
export function animationsReduites(): boolean {
	if (lirePreferences().animations === 'reduites') return true;
	return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
