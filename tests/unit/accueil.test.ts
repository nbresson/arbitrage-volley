import { describe, expect, test } from 'vitest';
import { lignesThemes, totaux, type Avancement } from '../../src/lib/data/avancement';

const av = (theme: string, ordre: number, total: number, acquises: number, a_revoir: number): Avancement => ({
	theme_id: `t-${ordre}`,
	theme,
	ordre,
	total,
	acquises,
	a_revoir
});

describe('lignesThemes', () => {
	test('un thème sans aucune réponse n’est pas commencé', () => {
		const [l] = lignesThemes([av('Le marqueur', 1, 24, 0, 0)]);
		expect(l).toEqual({ themeId: 't-1', theme: 'Le marqueur', acquises: 0, aRevoir: 0, total: 24, commence: false });
	});

	test('un thème avec au moins une réponse est commencé', () => {
		expect(lignesThemes([av('Le service', 1, 30, 0, 2)])[0].commence).toBe(true);
	});

	test('tri dans l’ordre des thèmes', () => {
		const l = lignesThemes([av('B', 2, 10, 1, 0), av('A', 1, 10, 0, 0), av('C', 3, 10, 0, 1)]);
		expect(l.map((x) => x.theme)).toEqual(['A', 'B', 'C']);
	});

	test('les thèmes sans aucune question validée sont masqués', () => {
		expect(lignesThemes([av('Vide', 1, 0, 0, 0), av('Plein', 2, 3, 0, 0)]).map((x) => x.theme)).toEqual(['Plein']);
	});
});

describe('totaux', () => {
	test('somme des questions travaillées, acquises et à revoir', () => {
		expect(totaux([av('A', 1, 30, 26, 2), av('B', 2, 20, 0, 0), av('C', 3, 10, 4, 5)])).toEqual({ travaillees: 37, acquises: 30, aRevoir: 7 });
	});
});
