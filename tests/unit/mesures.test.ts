import { expect, test } from 'vitest';
import { trierThemes } from '../../src/lib/data/mesures';

test('thèmes triés par réussite croissante, « peu de réponses » sous 20', () => {
	const t = trierThemes([
		{ theme: 'Service', reponses: 400, justes: 248 },
		{ theme: 'Libéro', reponses: 2, justes: 2 },
		{ theme: 'Filet', reponses: 50, justes: 20 }
	]);
	expect(t.map((x) => [x.theme, x.peu])).toEqual([
		['Filet', false],
		['Service', false],
		['Libéro', true]
	]);
});
