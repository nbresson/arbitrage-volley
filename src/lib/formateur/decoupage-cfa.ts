// Import assisté des consignes CFA : découpe un texte copié depuis un PDF ou un document Word (fonction pure).

export type ConsigneDecoupee = { reference: string; titre: string; texte: string };

// « 1. », « 1.2 », « 2 - », « Consigne 3 : », « Article 4 » en début de ligne.
const ENTETE = /^(?:(?:consigne|article)\s+)?(\d+(?:\.\d+)*)\.?\s*(?:[-–:)]\s*)?(.*)$/i;

/** Une consigne par numéro en début de ligne. Ce qui suit le numéro est un titre s'il est court, sinon le début du texte. */
export function decouperConsignes(texte: string): ConsigneDecoupee[] {
	const consignes: ConsigneDecoupee[] = [];
	let courante: (ConsigneDecoupee & { lignes: string[] }) | null = null;
	for (const brute of texte.split(/\r?\n/)) {
		const ligne = brute.trim();
		if (!ligne) continue;
		const m = ENTETE.exec(ligne);
		if (m && /^(?:(?:consigne|article)\s+)?\d/i.test(ligne)) {
			if (courante) consignes.push(fermer(courante));
			const reste = m[2].trim();
			const titre = reste.length <= 60 && !/[.!?]$/.test(reste) ? reste : '';
			courante = { reference: m[1], titre, texte: '', lignes: titre || !reste ? [] : [reste] };
		} else if (courante) courante.lignes.push(ligne);
	}
	if (courante) consignes.push(fermer(courante));
	return consignes;
}

const fermer = (c: ConsigneDecoupee & { lignes: string[] }): ConsigneDecoupee => ({ reference: c.reference, titre: c.titre, texte: c.lignes.join('\n') });
