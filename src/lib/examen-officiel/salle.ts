// Examen en salle : fonctions pures (test de connexion, textes d'envoi, saisie du code en six cases).
import { pluriel } from '#lib/domain/texte.ts';

export type QualiteConnexion = { etat: 'stable' | 'instable' | 'hors_ligne'; texte: string };

/** Durées de quelques allers-retours vers le serveur (null : pas de réponse). Lente au-delà de 1,5 s. */
export function qualiteConnexion(mesures: (number | null)[]): QualiteConnexion {
	const reussies = mesures.filter((m): m is number => m !== null);
	if (!reussies.length) return { etat: 'hors_ligne', texte: 'Pas de connexion : vérifiez le Wi-Fi ou les données mobiles.' };
	if (reussies.length < mesures.length || reussies.some((m) => m > 1500)) {
		return { etat: 'instable', texte: 'Connexion instable : rapprochez-vous du Wi-Fi ou d’un endroit mieux couvert.' };
	}
	return { etat: 'stable', texte: 'Connexion stable.' };
}

export const texteEnAttente = (n: number) => `${pluriel(n, 'réponse')} en attente d’envoi`;

export function texteFinAuto(n: number): string {
	if (n === 0) return 'Temps écoulé : aucune réponse n’avait été donnée.';
	return n === 1 ? 'Temps écoulé : votre réponse a été envoyée.' : `Temps écoulé : vos ${n} réponses ont été envoyées.`;
}

export const texteRetablie = (n: number) => (n ? `Connexion rétablie, ${pluriel(n, 'réponse')} ${n > 1 ? 'envoyées' : 'envoyée'}.` : 'Connexion rétablie.');

/** Saisie dans la case `i` : un chiffre avance d'une case, un code collé se répartit, une saisie vide efface. */
export function saisirChiffres(cases: string[], i: number, saisie: string): { cases: string[]; focus: number } {
	const chiffres = saisie.replace(/\D/g, '');
	const suite = [...cases];
	if (!saisie) {
		suite[i] = '';
		return { cases: suite, focus: i };
	}
	if (!chiffres) return { cases, focus: i };
	let k = i;
	for (const c of chiffres) {
		if (k >= suite.length) break;
		suite[k++] = c;
	}
	return { cases: suite, focus: Math.min(k, suite.length - 1) };
}
