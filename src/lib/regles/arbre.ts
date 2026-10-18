// Arborescence et recherche des règles (fonctions pures, sans accès réseau).

export type Regle = {
	id: string;
	edition: string;
	source: 'fivb_regles' | 'casebook' | 'cfa';
	reference: string;
	parent_reference: string | null;
	titre: string | null;
	texte: string;
	texte_original: string | null;
	renvois: string[];
	video_url: string | null;
};

export type NoeudRegle = { regle: Regle; enfants: NoeudRegle[] };

const nombres = (ref: string) => (ref.match(/\d+/g) ?? []).map(Number);

/** Tri numérique : 19.9 avant 19.10, « Cas 3.9 » avant « Cas 3.10 ». */
export function comparerReferences(a: string, b: string): number {
	const pa = a.replace(/[\d.\s]+$/, ''), pb = b.replace(/[\d.\s]+$/, '');
	if (pa !== pb) return pa.localeCompare(pb);
	const na = nombres(a), nb = nombres(b);
	for (let i = 0; i < Math.max(na.length, nb.length); i++) {
		const d = (na[i] ?? -1) - (nb[i] ?? -1);
		if (d) return d;
	}
	return 0;
}

export function construireArbre(regles: Regle[]): NoeudRegle[] {
	const tries = [...regles].sort((a, b) => comparerReferences(a.reference, b.reference));
	const noeuds = new Map(tries.map((r) => [r.reference, { regle: r, enfants: [] } as NoeudRegle]));
	const racines: NoeudRegle[] = [];
	for (const r of tries) {
		// Remonte jusqu'au plus proche ancêtre importé.
		let parent = r.parent_reference;
		while (parent && !noeuds.has(parent)) parent = parent.includes('.') ? parent.slice(0, parent.lastIndexOf('.')) : null;
		(parent ? noeuds.get(parent)!.enfants : racines).push(noeuds.get(r.reference)!);
	}
	return racines;
}

const normaliser = (s: string) =>
	s
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();

const REQUETE_REFERENCE = /^(cas\s+)?\d+(\.\d+)*$/i;

export function chercher(regles: Regle[], requete: string): Regle[] {
	return filtrer(regles, requete).sort((a, b) => comparerReferences(a.reference, b.reference));
}

function filtrer(regles: Regle[], requete: string): Regle[] {
	const q = requete.trim();
	if (!q) return [];
	if (REQUETE_REFERENCE.test(q)) {
		const prefixe = normaliser(q).replace(/\s+/, ' ');
		return regles.filter((r) => {
			const ref = normaliser(r.reference);
			return ref === prefixe || ref.startsWith(`${prefixe}.`);
		});
	}
	const mots = normaliser(q).split(/\s+/);
	return regles.filter((r) => {
		const contenu = normaliser(`${r.reference} ${r.titre ?? ''} ${r.texte}`);
		return mots.every((m) => contenu.includes(m));
	});
}
