// Lecture des règles : recherche surlignée, extraits, voisines, chapitre, glossaire, figures (fonctions pures).
import { comparerReferences, type Regle } from './arbre.ts';

const REFERENCE = /^(cas\s+)?\d+(\.\d+)*\.?$/i;

/** Un caractère sans accent ni majuscule (même longueur que l'original, pour garder les positions). */
const plier = (s: string) =>
	[...s].map((c) => c.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().charAt(0) || c).join('');

/** Recherche lancée dès deux lettres, ou dès un chiffre pour un numéro de règle. */
export const rechercheActive = (requete: string) => {
	const q = requete.trim();
	return REFERENCE.test(q) || q.length >= 2;
};

const motsCherches = (requete: string) =>
	REFERENCE.test(requete.trim()) ? [] : plier(requete).split(/\s+/).filter((m) => m.length >= 2);

export type Segment = { texte: string; marque: boolean };

export function segmentsSurlignes(texte: string, requete: string): Segment[] {
	const mots = motsCherches(requete);
	if (!mots.length) return [{ texte, marque: false }];
	const plie = plier(texte);
	const marques = new Array(texte.length).fill(false);
	for (const m of mots) {
		for (let i = plie.indexOf(m); i >= 0; i = plie.indexOf(m, i + m.length)) marques.fill(true, i, i + m.length);
	}
	const segments: Segment[] = [];
	for (let i = 0; i < texte.length; i++) {
		const dernier = segments.at(-1);
		if (dernier && dernier.marque === marques[i]) dernier.texte += texte[i];
		else segments.push({ texte: texte[i], marque: marques[i] });
	}
	return segments;
}

/** Un extrait d'environ `longueur` caractères autour du premier mot trouvé. */
export function extrait(texte: string, requete: string, longueur = 160): string {
	const plie = plier(texte);
	const positions = motsCherches(requete).map((m) => plie.indexOf(m)).filter((i) => i >= 0);
	if (!positions.length || texte.length <= longueur) return texte.length > longueur ? `${texte.slice(0, longueur).trimEnd()}…` : texte;
	const centre = Math.min(...positions);
	const debut = Math.max(0, centre - Math.floor(longueur / 3));
	const fin = Math.min(texte.length, debut + longueur);
	return `${debut > 0 ? '…' : ''}${texte.slice(debut, fin).trim()}${fin < texte.length ? '…' : ''}`;
}

/** Règle précédente et suivante dans l'ordre du règlement (même édition). */
export function voisines(edition: Regle[], regle: Regle): { precedente: Regle | null; suivante: Regle | null } {
	const tries = [...edition].sort((a, b) => comparerReferences(a.reference, b.reference));
	const i = tries.findIndex((r) => r.id === regle.id);
	return { precedente: tries[i - 1] ?? null, suivante: i >= 0 ? (tries[i + 1] ?? null) : null };
}

/** Le chapitre de la règle (son ancêtre le plus haut et toute sa descendance), à plat, avec la profondeur. */
export function chapitre(edition: Regle[], regle: Regle): { regle: Regle; profondeur: number }[] {
	const parRef = new Map(edition.map((r) => [r.reference, r]));
	let racine = regle;
	while (racine.parent_reference && parRef.has(racine.parent_reference)) racine = parRef.get(racine.parent_reference)!;
	const enfants = new Map<string, Regle[]>();
	for (const r of edition) if (r.parent_reference) enfants.set(r.parent_reference, [...(enfants.get(r.parent_reference) ?? []), r]);
	const liste: { regle: Regle; profondeur: number }[] = [];
	const parcourir = (r: Regle, profondeur: number) => {
		liste.push({ regle: r, profondeur });
		for (const e of (enfants.get(r.reference) ?? []).sort((a, b) => comparerReferences(a.reference, b.reference))) parcourir(e, profondeur + 1);
	};
	parcourir(racine, 0);
	return liste;
}

export type SegmentGlossaire = { texte: string; definition?: string };

/** Découpe le texte pour expliquer la première occurrence de chaque terme du glossaire (mot entier). */
export function segmentsGlossaire(texte: string, termes: { terme: string; definition: string }[]): SegmentGlossaire[] {
	const plie = plier(texte);
	const trouves: { debut: number; fin: number; definition: string }[] = [];
	for (const t of [...termes].sort((a, b) => b.terme.length - a.terme.length)) {
		const cle = plier(t.terme.trim());
		if (!cle) continue;
		for (let i = plie.indexOf(cle); i >= 0; i = plie.indexOf(cle, i + 1)) {
			const avant = plie[i - 1], apres = plie[i + cle.length];
			const entier = !(avant && /[\p{L}\p{N}]/u.test(avant)) && !(apres && /[\p{L}\p{N}]/u.test(apres));
			if (entier && !trouves.some((x) => i < x.fin && i + cle.length > x.debut)) {
				trouves.push({ debut: i, fin: i + cle.length, definition: t.definition });
				break;
			}
		}
	}
	trouves.sort((a, b) => a.debut - b.debut);
	const segments: SegmentGlossaire[] = [];
	let pos = 0;
	for (const t of trouves) {
		if (t.debut > pos) segments.push({ texte: texte.slice(pos, t.debut) });
		segments.push({ texte: texte.slice(t.debut, t.fin), definition: t.definition });
		pos = t.fin;
	}
	if (pos < texte.length || !segments.length) segments.push({ texte: texte.slice(pos) });
	return segments;
}

/** « Fig.11 (15) » → figure Fig.11, détail 15. Null si le renvoi n'est pas une figure. */
export function cleFigure(renvoi: string): { reference: string; detail: string | null; libelle: string } | null {
	const m = /^Fig\.(\d+[a-z]?)\s*(?:\((\w+)\))?$/.exec(renvoi.trim());
	if (!m) return null;
	return { reference: `Fig.${m[1]}`, detail: m[2] ?? null, libelle: `Figure ${m[1]}${m[2] ? `, n° ${m[2]}` : ''}` };
}
