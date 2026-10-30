// Raccourcis clavier valables partout : « / » pour chercher une règle, « ? » pour la liste des raccourcis.

export type ActionGlobale = 'recherche' | 'aide';

/** `saisie` : la touche est tapée dans un champ (le raccourci ne doit pas voler la frappe). */
export function actionGlobale(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; saisie: boolean }): ActionGlobale | null {
	if (e.saisie || e.ctrlKey || e.metaKey || e.altKey) return null;
	if (e.key === '/') return 'recherche';
	if (e.key === '?') return 'aide';
	return null;
}

/** Tous les raccourcis, pour la page d'aide et la fenêtre « ? ». */
export const RACCOURCIS: { groupe: string; raccourcis: { touches: string; action: string }[] }[] = [
	{
		groupe: 'Partout',
		raccourcis: [
			{ touches: '/', action: 'Chercher une règle' },
			{ touches: '?', action: 'Afficher cette liste de raccourcis' },
			{ touches: 'Échap', action: 'Fermer une fenêtre' }
		]
	},
	{
		groupe: 'Séance pédagogique',
		raccourcis: [
			{ touches: 'A à D ou 1 à 4', action: 'Choisir une réponse' },
			{ touches: 'Entrée', action: 'Valider la réponse' },
			{ touches: 'S', action: 'Passer à la question suivante après la correction' }
		]
	}
];

/** La cible de la touche est-elle un champ de saisie ? */
export const estSaisie = (cible: EventTarget | null) =>
	cible instanceof HTMLElement && (cible.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName));
