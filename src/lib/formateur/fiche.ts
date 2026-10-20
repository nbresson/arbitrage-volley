// Fiche stagiaire côté formateur : fonctions pures.
import type { DetailTentative } from '#lib/data/examens-formateur.ts';

/** Grille du détail question par question : l'état est toujours écrit (lecteurs d'écran), jamais porté par la seule couleur. */
export const casesDetail = (d: DetailTentative) =>
	d.questions.map((q) => ({
		n: q.ordre,
		juste: q.juste,
		aria: `Question ${q.ordre} : ${q.juste ? 'juste' : q.lettre === null ? 'sans réponse' : 'fausse'}`
	}));

export const libelleErreurs = (n: number) => `${n} erreur${n > 1 ? 's' : ''}`;
