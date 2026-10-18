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
