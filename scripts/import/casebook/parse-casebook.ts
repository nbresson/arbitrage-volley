// Extraction des cas du Casebook FIVB depuis docs/casebook-2025-fr.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { CasImport } from '../../../src/lib/domain/types';

/** Recolle les lignes d'un même paragraphe ; les paragraphes restent séparés par une ligne vide. */
function paragraphes(lignes: string[]): string {
	return lignes
		.join('\n')
		.trim()
		.split(/\n\s*\n/)
		.map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
		.filter(Boolean)
		.join('\n\n');
}

/** « *Règles 5.1.2, 21.3.1, Figure 9 ; Directives…* » → ['5.1.2', '21.3.1', 'Fig.9'] (texte avant « ; » seulement). */
export function reglesCitees(ligne: string): string[] {
	const avantPointVirgule = ligne.replace(/^\*|\*$/g, '').split(';')[0];
	const refs: string[] = [];
	for (const m of avantPointVirgule.matchAll(/Figures?\s*(\d+[a-z]?)|(\d+(?:\.\d+)*)/g)) {
		refs.push(m[1] ? `Fig.${m[1]}` : m[2]);
	}
	return refs;
}

type Section = 'avant' | 'situation' | 'decision' | 'original' | 'apres';

export function parseCasebook(md: string): CasImport[] {
	const cas: CasImport[] = [];
	let chapitre = '';
	let rubrique: string | null = null;
	let c: (CasImport & { s: string[]; d: string[]; o: string[] }) | null = null;
	let section: Section = 'avant';

	const clore = () => {
		if (!c) return;
		const { s, d, o, ...reste } = c;
		cas.push({ ...reste, situation: paragraphes(s), decision: paragraphes(d), texte_original: paragraphes(o) });
		c = null;
	};

	for (const l of md.split(/\r?\n/)) {
		if (/^## Annexe/.test(l)) break;
		const chap = l.match(/^## Chapitre \d+ — (.+)$/);
		if (chap) {
			clore();
			chapitre = chap[1].trim();
			rubrique = null;
			continue;
		}
		const rub = l.match(/^### (.+)$/);
		if (rub && chapitre) {
			clore();
			rubrique = rub[1].trim();
			continue;
		}
		const titre = l.match(/^#### (Cas [\d.]+)(?:\s*·\s*\*(nouveau|modifié) en 2025\*)?\s*$/);
		if (titre && chapitre) {
			clore();
			c = {
				reference: titre[1],
				chapitre,
				rubrique,
				mention_2025: titre[2] === 'nouveau' ? 'nouveau' : titre[2] === 'modifié' ? 'modifie' : null,
				video_url: null,
				situation: '',
				decision: '',
				regles_citees: [],
				texte_original: '',
				ordre: cas.length,
				s: [],
				d: [],
				o: []
			};
			section = 'avant';
			continue;
		}
		if (!c) continue;
		const cur: CasImport & { s: string[]; d: string[]; o: string[] } = c;

		const video = l.match(/^\[▶ Vidéo\]\((\S+)\)/);
		if (video && section === 'avant') {
			cur.video_url = video[1];
			continue;
		}
		if (l.startsWith('**Situation.**')) {
			section = 'situation';
			cur.s.push(l.replace('**Situation.**', ''));
			continue;
		}
		const dec = l.match(/^\*\*(Décision|Principe)\.\*\*(.*)$/);
		if (dec && section === 'situation') {
			section = 'decision';
			cur.d.push(dec[2]);
			continue;
		}
		if (/^\*Règles? /.test(l) && section === 'decision') {
			cur.regles_citees = reglesCitees(l.trim());
			section = 'apres';
			continue;
		}
		if (l.startsWith('<details>')) {
			section = 'apres';
			continue;
		}
		if (l.startsWith('<summary>')) {
			section = 'original';
			continue;
		}
		if (l.startsWith('</details>')) {
			section = 'apres';
			continue;
		}
		if (section === 'situation') cur.s.push(l);
		else if (section === 'decision') cur.d.push(l);
		else if (section === 'original') cur.o.push(l);
	}
	clore();
	return cas;
}

// Utilisation : npx tsx scripts/import/casebook/parse-casebook.ts <casebook.md> <sortie.json>
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const [entree, sortie] = process.argv.slice(2);
	if (!entree || !sortie) {
		console.error('Usage : parse-casebook.ts <casebook.md> <sortie.json>');
		process.exit(1);
	}
	const cas = parseCasebook(readFileSync(entree, 'utf8'));
	writeFileSync(sortie, JSON.stringify(cas, null, '\t') + '\n');
	console.log(`${cas.length} cas écrits dans ${sortie}`);
}
