// Déroulé d'une séance en mode pédagogique : fonctions pures, sans accès réseau.
import type { Lettre } from '#lib/domain/types.ts';

export type QuestionSeance = {
	ordre: number;
	question_id: string;
	enonce: string;
	theme: string;
	niveau: string;
	role_cible: string;
	video_url: string | null;
	propositions: { id: string; lettre: Lettre; texte: string }[];
	deja_repondue: boolean;
};

export type SourceCitee = {
	source: 'fivb_regles' | 'casebook' | 'cfa';
	edition: string;
	reference: string;
	texte: string;
	texte_original: string | null;
	principale: boolean;
	/** Passage de la règle à surligner dans la correction (facultatif). */
	passage?: string | null;
};

/** Valeur du choix « Je ne sais pas » : compte comme une erreur, sans deviner. */
export const JE_NE_SAIS_PAS = 'je-ne-sais-pas';

/** Réponse de la fonction valider_reponse pour une séance pédagogique. */
export type ResultatValidation = {
	correcte: boolean;
	/** Proposition réellement enregistrée par le serveur (la première réponse fait foi). */
	proposition_id?: string;
	bonne_proposition_id: string;
	/** Le stagiaire a répondu « je ne sais pas ». */
	sans_reponse?: boolean;
	explication: string;
	/** Pourquoi chaque mauvaise proposition est fausse (id → texte), quand le formateur l'a rédigé. */
	explications_propositions?: Record<string, string>;
	sources: SourceCitee[];
};

export type EtatPedago = {
	questions: QuestionSeance[];
	index: number;
	choix: string | null;
	resultat: ResultatValidation | null;
	acquises: number;
	aRevoir: number;
	envoi: 'repos' | 'en_cours' | 'erreur';
	terminee: boolean;
};

export const etatInitial = (questions: QuestionSeance[], acquises = 0, aRevoir = 0): EtatPedago => ({
	questions,
	index: 0,
	choix: null,
	resultat: null,
	acquises,
	aRevoir,
	envoi: 'repos',
	terminee: false
});

export const choisir = (e: EtatPedago, propositionId: string): EtatPedago =>
	e.resultat || e.envoi === 'en_cours' ? e : { ...e, choix: propositionId, envoi: e.envoi === 'erreur' ? 'repos' : e.envoi };

export const debutValidation = (e: EtatPedago): EtatPedago =>
	!e.choix || e.resultat || e.envoi === 'en_cours' ? e : { ...e, envoi: 'en_cours' };

export const finValidation = (e: EtatPedago, r: ResultatValidation): EtatPedago => ({
	...e,
	choix: r.sans_reponse ? JE_NE_SAIS_PAS : (r.proposition_id ?? e.choix),
	resultat: r,
	envoi: 'repos',
	acquises: e.acquises + (r.correcte ? 1 : 0),
	aRevoir: e.aRevoir + (r.correcte ? 0 : 1)
});

export const echecValidation = (e: EtatPedago): EtatPedago => ({ ...e, envoi: 'erreur' });

export function suivante(e: EtatPedago): EtatPedago {
	if (!e.resultat) return e;
	if (e.index >= e.questions.length - 1) return { ...e, terminee: true };
	return { ...e, index: e.index + 1, choix: null, resultat: null, envoi: 'repos' };
}
