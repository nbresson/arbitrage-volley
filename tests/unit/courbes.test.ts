import { expect, test } from 'vitest';
import { courbesReussite } from '../../src/lib/formateur/courbes.ts';

const s = (stagiaire_id: string, debut: string, correctes: (boolean | null)[]) => ({
	stagiaire_id,
	debut,
	reponses: correctes.map((correcte) => ({ correcte }))
});

test('taux de réussite des 5 dernières séances, de la plus ancienne à la plus récente', () => {
	const c = courbesReussite([
		s('a', '2026-10-06', [true]),
		s('a', '2026-10-05', [true, false]),
		s('a', '2026-10-04', [false, false, true, true]),
		s('a', '2026-10-03', [true, true]),
		s('a', '2026-10-02', [false]),
		s('a', '2026-10-01', [true]),
		s('b', '2026-10-01', [true, true, true, false])
	]);
	expect(c.get('a')).toEqual([0, 100, 50, 50, 100]);
	expect(c.get('b')).toEqual([75]);
});

test('les séances sans réponse comptée sont ignorées', () => {
	const c = courbesReussite([s('a', '2026-10-02', []), s('a', '2026-10-01', [null])]);
	expect(c.get('a')).toBeUndefined();
});
