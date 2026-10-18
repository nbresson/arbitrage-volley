import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parseCasebook } from '../../scripts/import/casebook/parse-casebook';

const cas = parseCasebook(readFileSync('docs/casebook-2025-fr.md', 'utf8'));
const trouver = (ref: string) => {
	const c = cas.find((x) => x.reference === ref);
	if (!c) throw new Error(`${ref} absent`);
	return c;
};

describe('parseCasebook', () => {
	test('les 208 cas, sans doublon, dans l’ordre du fichier', () => {
		expect(cas).toHaveLength(208);
		expect(new Set(cas.map((c) => c.reference)).size).toBe(208);
		expect(cas.map((c) => c.ordre)).toEqual(cas.map((_, i) => i));
	});

	test('Cas 3.35.1 : chapitre, rubrique, mention, règles, vidéo', () => {
		expect(trouver('Cas 3.35.1')).toMatchObject({
			chapitre: 'Actions de jeu',
			rubrique: "Frappe d'attaque",
			mention_2025: 'nouveau',
			regles_citees: ['13.3.6', '19.3.1.4']
		});
		expect(trouver('Cas 3.35.1').video_url).toMatch(/^http:\/\/www\.fivbacademy\.com\/.+\.mp4$/);
	});

	test('Cas 3.35.1 : situation, décision et texte anglais', () => {
		const c = trouver('Cas 3.35.1');
		expect(c.situation).toMatch(/^Le Libéro, dans la zone avant, a joué le ballon en passe haute des doigts, puis/);
		expect(c.situation).toMatch(/Était-ce une décision correcte \?$/);
		expect(c.decision).toMatch(/^Oui, car il s'agissait d'une attaque fautive/);
		expect(c.decision).toMatch(/comme une passe classique\.$/);
		expect(c.texte_original).toMatch(/^\*\*3\.35\.1\*\* The Libero/);
		expect(c.texte_original).not.toMatch(/<\/?details>|<summary>/);
	});

	test('Cas 1.1 : rubrique et règles citées', () => {
		expect(trouver('Cas 1.1').rubrique).toBe('Objets interdits');
		expect(trouver('Cas 1.1').regles_citees).toEqual(['4.5.1', '4.5.3']);
		expect(trouver('Cas 1.1').mention_2025).toBeNull();
		expect(trouver('Cas 1.1').video_url).toBeNull();
	});

	test('une décision sur plusieurs paragraphes est gardée entière, paragraphes séparés', () => {
		expect(trouver('Cas 1.1').decision).toMatch(/^Il est important de distinguer[\s\S]*\n\nDans le cas d'un maintien d'avant-bras/);
	});

	test('« Figure 9 » devient Fig.9 ; les autres textes cités sont ignorés', () => {
		expect(trouver('Cas 1.3').regles_citees).toEqual(['5.1.2', '20.1', '20.2', '21.2', '21.3.1', 'Fig.9']);
		expect(cas.flatMap((c) => c.regles_citees).every((r) => /^(\d+(\.\d+)*|Fig\.\d+[a-z]?)$/.test(r))).toBe(true);
	});

	test('chapitre sans rubrique ; mention « modifié en 2025 »', () => {
		expect(trouver('Cas 5.1')).toMatchObject({ chapitre: 'Le Libéro', rubrique: null, regles_citees: ['19.3.2.4', '19.3.2.8', '24.3.1'] });
		expect(trouver('Cas 2.7').mention_2025).toBe('modifie');
	});

	test('« Principe » tient lieu de décision (Cas 8.1)', () => {
		expect(trouver('Cas 8.1').decision).toMatch(/^L'arbitre doit maintenir le jeu à un rythme constant/);
	});

	test('chaque cas a une situation, une décision et un texte anglais', () => {
		for (const c of cas) {
			expect(c.situation, c.reference).not.toBe('');
			expect(c.decision, c.reference).not.toBe('');
			expect(c.texte_original, c.reference).not.toBe('');
		}
	});
});
