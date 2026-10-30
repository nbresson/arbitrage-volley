import { describe, expect, test } from 'vitest';
import { comparaison, examenPrecedent, SEUIL_BLANC, tempsUtilise, verdictBlanc } from '../../src/lib/seance/resultat-blanc';

describe('verdictBlanc (seuil provisoire de 70 %)', () => {
	test('le seuil vaut 70 %', () => {
		expect(SEUIL_BLANC).toBe(0.7);
	});

	test('21 sur 30 : réussi', () => {
		expect(verdictBlanc(21, 30)).toEqual({ reussi: true, seuil: 21, texte: 'Vous auriez réussi l’examen officiel (seuil 21 / 30).' });
	});

	test('19 sur 30 : il manque 2 points', () => {
		expect(verdictBlanc(19, 30)).toEqual({ reussi: false, seuil: 21, texte: 'Il manque 2 points pour réussir l’examen officiel (seuil 21 / 30).' });
	});

	test('accord au singulier', () => {
		expect(verdictBlanc(20, 30).texte).toBe('Il manque 1 point pour réussir l’examen officiel (seuil 21 / 30).');
	});

	test('seuil arrondi au supérieur sur un petit examen', () => {
		expect(verdictBlanc(7, 10).seuil).toBe(7);
		expect(verdictBlanc(9, 12).seuil).toBe(9); // 8,4 → 9
	});
});

describe('comparaison avec le dernier examen blanc', () => {
	test('même nombre de questions : écart en points', () => {
		expect(comparaison({ score: 24, total: 30 }, { score: 21, total: 30 })).toBe('+3 points par rapport à votre dernier examen blanc.');
		expect(comparaison({ score: 20, total: 30 }, { score: 21, total: 30 })).toBe('−1 point par rapport à votre dernier examen blanc.');
		expect(comparaison({ score: 21, total: 30 }, { score: 21, total: 30 })).toBe('Même score que votre dernier examen blanc.');
	});

	test('nombre de questions différent : écart en pourcentage', () => {
		expect(comparaison({ score: 8, total: 10 }, { score: 21, total: 30 })).toBe('+10 % de bonnes réponses par rapport à votre dernier examen blanc.');
		expect(comparaison({ score: 7, total: 10 }, { score: 21, total: 30 })).toBe('Même taux de réussite que votre dernier examen blanc.');
	});

	test('aucun examen précédent', () => {
		expect(comparaison({ score: 21, total: 30 }, null)).toBeNull();
	});
});

describe('tempsUtilise', () => {
	const debut = '2026-10-18T10:00:00Z';
	test('31 min sur 45', () => {
		expect(tempsUtilise(debut, '2026-10-18T10:31:20Z', 45)).toBe('31 min sur 45');
	});

	test('moins d’une minute', () => {
		expect(tempsUtilise(debut, '2026-10-18T10:00:40Z', 45)).toBe('moins d’une minute sur 45');
	});

	test('jamais plus que la durée prévue (fin automatique un peu tardive)', () => {
		expect(tempsUtilise(debut, '2026-10-18T10:47:00Z', 45)).toBe('45 min sur 45');
	});

	test('sans fin ou sans durée : rien', () => {
		expect(tempsUtilise(debut, null, 45)).toBeNull();
		expect(tempsUtilise(debut, '2026-10-18T10:31:00Z', null)).toBeNull();
	});
});

describe('examenPrecedent', () => {
	const liste = [
		{ id: 'a', debut: '2026-10-01T10:00:00Z', score: 18, total: 30 },
		{ id: 'b', debut: '2026-10-05T10:00:00Z', score: 21, total: 30 },
		{ id: 'c', debut: '2026-10-09T10:00:00Z', score: 24, total: 30 }
	];
	test('l’examen terminé juste avant, même si la liste n’est pas triée', () => {
		expect(examenPrecedent([liste[2], liste[0], liste[1]], 'c')?.id).toBe('b');
	});
	test('premier examen, ou examen absent de la liste : aucun', () => {
		expect(examenPrecedent(liste, 'a')).toBeNull();
		expect(examenPrecedent(liste, 'z')).toBeNull();
	});
});
