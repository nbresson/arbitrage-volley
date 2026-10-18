// Extraction des articles des Règles officielles FIVB depuis le texte du PDF.
// Le texte attendu est celui de `pdftotext -raw -enc UTF-8` : les renvois de la
// colonne de droite y apparaissent sur des lignes séparées ou en fin de ligne.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { RegleImport } from '../../../src/lib/domain/types';

const REF = String.raw`(?:\d+(?:\.\d+)*[a-z]?|Fig\.\s?\d+[a-z]?(?:\s\(\d+[a-z]?(?:,\s*\d+[a-z]?)*\))?|Chapitre\s\d+)`;
const ITEM = String.raw`(?:${REF}|[a-z])`;
/** Ligne composée uniquement de renvois : « 1.4.1, 13.3.6, », « 23.3.2.3d, e, », « Fig.11 (12) ». */
const LIGNE_RENVOIS = new RegExp(String.raw`^${REF}(?:\s*,\s*${ITEM})*\s*,?$`);
/** Renvois collés en fin de ligne, précédés d'un espace. */
const RENVOIS_FIN = new RegExp(String.raw`\s(${REF}(?:\s*,\s*${ITEM})*\s*,?)$`);
const DEBUT_ARTICLE = /^(\d{1,2}(?:\.\d+)*)\s+(.+)$/;

const estBruit = (l: string) =>
	l.includes('.....') ||
	/^\d{1,3}$/.test(l) ||
	/^(PARTIE|SECTION)\b/.test(l) ||
	/^Chapitre \d+$/i.test(l) ||
	/^Voir Règles$/i.test(l);

const sansMinuscule = (s: string) => /\p{L}/u.test(s) && !/\p{Ll}/u.test(s);

/** Découpe « 1.4.1, 23.3.2.3d, e, Fig. 4 » en références normalisées. */
export function decouperRenvois(liste: string): string[] {
	const sortie: string[] = [];
	// Les virgules à l'intérieur d'une parenthèse (« Fig.12 (1, 2) ») ne séparent pas les renvois.
	for (const brut of liste.split(/,(?![^(]*\))/)) {
		const t = brut.trim().replace(/^Fig\.\s+/, 'Fig.');
		if (!t) continue;
		if (/^[a-z]$/.test(t) && sortie.length) {
			sortie.push(sortie[sortie.length - 1].replace(/[a-z]$/, '') + t);
		} else sortie.push(t);
	}
	return sortie;
}

/** Sépare un texte de ses renvois finaux. Hors titre, il faut un numéro pointé ou une figure. */
function extraireRenvoisFin(s: string, titre: boolean): { reste: string; renvois: string[] } {
	const m = s.match(RENVOIS_FIN);
	if (!m || m.index === undefined) return { reste: s, renvois: [] };
	if (!titre && !/\d\.\d|Fig\.|Chapitre/.test(m[1])) return { reste: s, renvois: [] };
	return { reste: s.slice(0, m.index).trim(), renvois: decouperRenvois(m[1]) };
}

const segments = (ref: string) => ref.split('.').map(Number);

/** Un numéro en début de ligne n'ouvre un article que s'il suit logiquement le précédent. */
function estSuivant(candidat: string, precedent: string | null, reste: string): boolean {
	const c = segments(candidat);
	if (c[0] < 1 || c[0] > 29) return false;
	if (c.length === 1 && !sansMinuscule(extraireRenvoisFin(reste, true).reste)) return false;
	if (!precedent) return true;
	const p = segments(precedent);
	let k = 0;
	while (k < c.length && k < p.length && c[k] === p[k]) k++;
	if (k === p.length) return c.length === k + 1; // enfant direct
	if (k === c.length) return false; // ancêtre ou identique
	return c[k] > p[k];
}

export function parseRegles(texte: string): RegleImport[] {
	const regles: RegleImport[] = [];
	let courante: (RegleImport & { lignes: string[] }) | null = null;
	let commence = false;

	const clore = () => {
		if (!courante) return;
		const { lignes, ...r } = courante;
		// « au-» en fin de ligne + « dessus » au début de la suivante → « au-dessus ».
		r.texte = lignes
			.reduce((acc, l) => (acc.endsWith('-') ? acc + l : acc ? `${acc} ${l}` : l), '')
			.replace(/\s+/g, ' ')
			.trim();
		regles.push(r);
		courante = null;
	};

	for (const brute of texte.split(/\r?\n/)) {
		const l = brute.trim();
		if (!commence) {
			if (/^SECTION 1\b/.test(l)) commence = true;
			continue;
		}
		if (/^SECTION 3\b|^Règles concernées|^DÉFINITIONS$/.test(l)) break;
		if (!l || estBruit(l)) continue;

		const art = l.match(DEBUT_ARTICLE);
		if (art && !LIGNE_RENVOIS.test(l) && estSuivant(art[1], courante?.reference ?? regles.at(-1)?.reference ?? null, art[2])) {
			clore();
			const reference = art[1];
			const premier = art[2];
			const titreMaj = sansMinuscule(extraireRenvoisFin(premier, true).reste);
			const { reste, renvois } = extraireRenvoisFin(premier, titreMaj);
			const estTitre = titreMaj || (reste.length < 50 && !/[.;:,]$/.test(reste) && /^\p{Lu}/u.test(reste));
			courante = {
				reference,
				parent_reference: reference.includes('.') ? reference.slice(0, reference.lastIndexOf('.')) : null,
				titre: estTitre ? reste : null,
				texte: '',
				renvois,
				ordre: regles.length,
				lignes: estTitre ? [] : [reste]
			};
			continue;
		}
		if (!courante) continue;
		if (LIGNE_RENVOIS.test(l)) {
			courante.renvois.push(...decouperRenvois(l));
			continue;
		}
		if (sansMinuscule(l)) continue; // encadré de marge en capitales
		const { reste, renvois } = extraireRenvoisFin(l, false);
		courante.lignes.push(reste);
		courante.renvois.push(...renvois);
	}
	clore();
	return regles;
}

// Utilisation : npx tsx scripts/import/regles/parse-regles.ts <pdf> <sortie.json>
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const [pdf, sortie] = process.argv.slice(2);
	if (!pdf || !sortie) {
		console.error('Usage : parse-regles.ts <pdf> <sortie.json>');
		process.exit(1);
	}
	const texte = execFileSync('pdftotext', ['-raw', '-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', maxBuffer: 50e6 });
	const regles = parseRegles(texte);
	writeFileSync(sortie, JSON.stringify(regles, null, '\t') + '\n');
	console.log(`${regles.length} articles écrits dans ${sortie}`);
}
