// Examen officiel côté stagiaire : fonctions pures.
import type { Convocation } from '#lib/data/examens-officiels.ts';

/** Le code d'accès est fait de 6 chiffres : espaces, tirets et autres caractères saisis sont ignorés. */
export const normaliserCode = (saisie: string) => saisie.replace(/\D/g, '');

export type EtatConvocation = 'a_venir' | 'ouvert' | 'en_cours' | 'termine';

export function etatConvocation(c: Convocation): EtatConvocation {
	if (c.terminee) return 'termine';
	if (c.tentative_id) return 'en_cours';
	return c.statut === 'brouillon' ? 'a_venir' : 'ouvert';
}

/** Un examen ouvert ou commencé : le jour J, il passe avant tout le reste sur l'accueil. */
export const examenActif = (cs: Convocation[]) => cs.some((c) => ['ouvert', 'en_cours'].includes(etatConvocation(c)));

/** « samedi 1 novembre 2026 à 10:00 » */
export const dateHeure = (iso: string) =>
	new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(iso));
