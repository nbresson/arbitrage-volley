// File des réponses d'examen pas encore envoyées (coupure réseau). Persistée dans le navigateur.

export type ReponseEnAttente = { seanceId: string; questionId: string; propositionId: string; reponduLe: string };

export function creerFile(stockage: Storage, cle: string) {
	const lire = (): ReponseEnAttente[] => {
		try {
			const v = JSON.parse(stockage.getItem(cle) ?? '[]');
			return Array.isArray(v) ? v : [];
		} catch {
			return [];
		}
	};
	const ecrire = (liste: ReponseEnAttente[]) => {
		try {
			stockage.setItem(cle, JSON.stringify(liste));
		} catch {
			/* stockage plein ou interdit : la réponse reste en mémoire de la page */
		}
	};

	return {
		/** Une seule entrée par question : la plus récente, placée en fin de file. */
		ajouter(r: ReponseEnAttente) {
			ecrire([...lire().filter((x) => !(x.seanceId === r.seanceId && x.questionId === r.questionId)), r]);
		},
		lister: lire,
		/** Envoie dans l'ordre ; s'arrête au premier échec et garde le reste. */
		async vider(envoyer: (r: ReponseEnAttente) => Promise<void>): Promise<{ envoyees: number; restantes: number }> {
			let liste = lire();
			let envoyees = 0;
			while (liste.length) {
				try {
					await envoyer(liste[0]);
				} catch {
					break;
				}
				envoyees++;
				liste = liste.slice(1);
				ecrire(liste);
			}
			return { envoyees, restantes: liste.length };
		}
	};
}
