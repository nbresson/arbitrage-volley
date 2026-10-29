import { expect, test } from 'vitest';
import { casesProgression } from '../../src/lib/domain/progression.ts';

const compte = (c: string[]) => ({ a: c.filter((x) => x === 'acquise').length, r: c.filter((x) => x === 'a_revoir').length, v: c.filter((x) => x === 'vide').length });

test('10 volets répartis selon les proportions, acquises d’abord', () => {
	const c = casesProgression(6, 2, 20);
	expect(c).toHaveLength(10);
	expect(compte(c)).toEqual({ a: 3, r: 1, v: 6 });
	expect(c.slice(0, 4)).toEqual(['acquise', 'acquise', 'acquise', 'a_revoir']);
});

test('une seule réponse se voit toujours : au moins un volet', () => {
	expect(compte(casesProgression(1, 0, 40))).toEqual({ a: 1, r: 0, v: 9 });
	expect(compte(casesProgression(0, 1, 40))).toEqual({ a: 0, r: 1, v: 9 });
});

test('jamais plus de 10 volets ni de volets négatifs', () => {
	expect(compte(casesProgression(10, 10, 20))).toEqual({ a: 5, r: 5, v: 0 });
	expect(compte(casesProgression(19, 1, 20))).toEqual({ a: 9, r: 1, v: 0 });
	expect(compte(casesProgression(0, 0, 0))).toEqual({ a: 0, r: 0, v: 10 });
});
