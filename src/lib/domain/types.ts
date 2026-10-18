// Types partagés entre le front et les scripts d'import.

/** Un article des Règles officielles, tel qu'extrait du PDF. */
export type RegleImport = {
	reference: string;
	parent_reference: string | null;
	titre: string | null;
	texte: string;
	renvois: string[];
	ordre: number;
};

/** Un cas du Casebook FIVB (traduction française non officielle). */
export type CasImport = {
	reference: string; // « Cas 3.35.1 »
	chapitre: string;
	rubrique: string | null;
	mention_2025: 'nouveau' | 'modifie' | null;
	video_url: string | null;
	situation: string;
	decision: string;
	regles_citees: string[];
	texte_original: string;
	ordre: number;
};

export type Lettre = 'A' | 'B' | 'C' | 'D';
export type RoleCible = 'arbitre' | 'marqueur' | 'les_deux';

/** Brouillon de question rédigé à partir d'un cas du Casebook (data/brouillons-*.json). */
export type BrouillonQuestion = {
	cas: string; // « Cas 3.35.1 »
	enonce: string;
	propositions: { lettre: Lettre; texte: string; correcte: boolean }[];
	explication: string;
	theme: string;
	niveau: string;
	role_cible: RoleCible;
	regles: string[]; // références de règles et/ou du cas lui-même
	regle_principale: string;
};

/** Cas volontairement laissé sans question (question ouverte, décisions multiples…). */
export type CasSansQuestion = { cas: string; sans_question: true; raison: string };

export type EntreeBrouillon = BrouillonQuestion | CasSansQuestion;

export type Probleme = { cas: string; gravite: 'erreur' | 'avertissement'; message: string };
