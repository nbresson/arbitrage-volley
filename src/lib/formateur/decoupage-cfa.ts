// Import assisté des consignes CFA : découpe un texte copié depuis un PDF ou un document Word (fonction pure).

export type ConsigneDecoupee = { reference: string; titre: string; texte: string; doublon: boolean };

// Un numéro n'ouvre une consigne que s'il est annoncé comme tel : « Consigne 3 », « Article 4 »,
// un numéro à points (« 1.2 »), ou un numéro suivi d'un séparateur (« 1. », « 2 - », « 3) », « 4 : »).
// « 2 joueurs se gênent » reste donc du texte.
const ENTETE =
	/^(?:(?:consigne|article)\s+(\d+(?:\.\d+)*)\.?\s*(?:[-–:)]\s*)?|(\d+(?:\.\d+)+)\.?(?:\s+(?:[-–:)]\s*)?|$)|(\d+)\s*[.)\-–:](?:\s+|$))(.*)$/i;

/** Une consigne par numéro en début de ligne. Ce qui suit le numéro est un titre s'il est court, sinon le début du texte. */
export function decouperConsignes(texte: string): ConsigneDecoupee[] {
	const consignes: ConsigneDecoupee[] = [];
	let courante: (ConsigneDecoupee & { lignes: string[] }) | null = null;
	for (const brute of texte.split(/\r?\n/)) {
		const ligne = brute.trim();
		if (!ligne) continue;
		const m = ENTETE.exec(ligne);
		if (m) {
			if (courante) consignes.push(fermer(courante));
			const reste = m[4].trim();
			const titre = reste.length <= 60 && !/[.!?]$/.test(reste) ? reste : '';
			courante = { reference: m[1] ?? m[2] ?? m[3], titre, texte: '', doublon: false, lignes: titre || !reste ? [] : [reste] };
		} else if (courante) courante.lignes.push(ligne);
	}
	if (courante) consignes.push(fermer(courante));
	return marquerDoublons(consignes);
}

/** Le numéro pris pour une consigne n'en était pas un : sa ligne et son texte rejoignent la consigne précédente. */
export function rattacherALaPrecedente<T extends ConsigneDecoupee>(l: T[], i: number): T[] {
	if (i <= 0 || i >= l.length) return l;
	const c = l[i];
	const entete = c.titre ? `${c.reference} ${c.titre}` : `${c.reference} ${c.texte.split('\n')[0] ?? ''}`.trim();
	const suite = c.titre ? c.texte : c.texte.split('\n').slice(1).join('\n');
	const ajout = [entete, suite].filter(Boolean).join('\n');
	const precedente = { ...l[i - 1], texte: [l[i - 1].texte, ajout].filter(Boolean).join('\n') };
	return marquerDoublons([...l.slice(0, i - 1), precedente, ...l.slice(i + 1)]);
}

function marquerDoublons<T extends ConsigneDecoupee>(l: T[]): T[] {
	const n = new Map<string, number>();
	for (const c of l) n.set(c.reference, (n.get(c.reference) ?? 0) + 1);
	return l.map((c) => ({ ...c, doublon: (n.get(c.reference) ?? 0) > 1 }));
}

const fermer = (c: ConsigneDecoupee & { lignes: string[] }): ConsigneDecoupee => ({ reference: c.reference, titre: c.titre, texte: c.lignes.join('\n'), doublon: false });
