// Examen d'entraînement : fonctions pures (temps, textes, navigation).

export function tempsRestant(debut: Date, dureeMinutes: number, maintenant: Date) {
	const reste = Math.max(0, Math.ceil((debut.getTime() + dureeMinutes * 60_000 - maintenant.getTime()) / 1000));
	return {
		minutes: Math.floor(reste / 60),
		secondes: reste % 60,
		faible: reste < 5 * 60,
		ecoule: reste === 0
	};
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const IRREVERSIBLE = 'Une fois terminé, vous ne pourrez plus modifier vos réponses.';

export function texteConfirmation(sansReponse: number, signalees: number): { titre: string; texte: string } {
	if (sansReponse > 0) {
		return {
			titre: 'Terminer l’examen maintenant ?',
			texte: `${pluriel(sansReponse, 'question')} sans réponse et ${pluriel(signalees, 'signalée')} à vérifier. ${IRREVERSIBLE}`
		};
	}
	const dont = signalees ? `, dont ${pluriel(signalees, 'signalée')} à vérifier` : '';
	return { titre: 'Terminer et voir votre score ?', texte: `Toutes les questions ont une réponse${dont}. ${IRREVERSIBLE}` };
}

/** Prochaine question sans réponse après `courante` (en reprenant au début), ou null. Numéros de 1 à total. */
export function prochaineSansReponse(repondues: Set<number>, courante: number, total: number): number | null {
	for (let i = 1; i <= total; i++) {
		const n = ((courante - 1 + i) % total) + 1;
		if (!repondues.has(n)) return n;
	}
	return null;
}
