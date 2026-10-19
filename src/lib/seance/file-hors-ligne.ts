// File des réponses d'examen pas encore envoyées (coupure réseau). Persistée dans le navigateur.

export type ReponseEnAttente = { seanceId: string; questionId: string; propositionId: string; reponduLe: string };

/** Refus du serveur qui ne changera pas en réessayant (temps écoulé, séance terminée…). */
export class RefusDefinitif extends Error {}

export type BilanVidage = { envoyees: number; restantes: number; refusees: number; messageRefus?: string };

const meme = (a: ReponseEnAttente, b: ReponseEnAttente) =>
	a.seanceId === b.seanceId && a.questionId === b.questionId && a.reponduLe === b.reponduLe && a.propositionId === b.propositionId;

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
	/** Retire une entrée précise, en relisant le stockage (des réponses ont pu arriver entre-temps). */
	const retirer = (r: ReponseEnAttente) => ecrire(lire().filter((x) => !meme(x, r)));

	// Un seul vidage à la fois : les appels simultanés attendent le précédent puis reprennent la file à jour.
	let enCours: Promise<BilanVidage> = Promise.resolve({ envoyees: 0, restantes: 0, refusees: 0 });

	async function viderUneFois(envoyer: (r: ReponseEnAttente) => Promise<void>): Promise<BilanVidage> {
		const bilan: BilanVidage = { envoyees: 0, restantes: 0, refusees: 0 };
		const tentees: ReponseEnAttente[] = [];
		for (;;) {
			const suivante = lire().find((x) => !tentees.some((t) => meme(t, x)));
			if (!suivante) break;
			tentees.push(suivante);
			try {
				await envoyer(suivante);
				bilan.envoyees++;
				retirer(suivante);
			} catch (e) {
				if (e instanceof RefusDefinitif) {
					bilan.refusees++;
					bilan.messageRefus = e.message;
					retirer(suivante);
					continue;
				}
				break; // réseau : on garde tout et on réessaiera
			}
		}
		bilan.restantes = lire().length;
		return bilan;
	}

	return {
		/** Une seule entrée par question : la plus récente, placée en fin de file. */
		ajouter(r: ReponseEnAttente) {
			ecrire([...lire().filter((x) => !(x.seanceId === r.seanceId && x.questionId === r.questionId)), r]);
		},
		lister: lire,
		/** Envoie dans l'ordre ; s'arrête à la première erreur réseau ; retire les refus définitifs. */
		vider(envoyer: (r: ReponseEnAttente) => Promise<void>): Promise<BilanVidage> {
			enCours = enCours.catch(() => undefined).then(() => viderUneFois(envoyer));
			return enCours;
		}
	};
}
