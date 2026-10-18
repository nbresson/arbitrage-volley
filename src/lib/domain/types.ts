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
