import { describe, expect, test } from 'vitest';
import { prochaineSansReponse, tempsRestant, texteConfirmation } from '../../src/lib/seance/examen';

const debut = new Date('2026-10-18T10:00:00Z');
const apres = (min: number, s = 0) => new Date(debut.getTime() + (min * 60 + s) * 1000);

describe('tempsRestant', () => {
	test('18 min 42 s restantes', () => {
		expect(tempsRestant(debut, 45, apres(26, 18))).toEqual({ minutes: 18, secondes: 42, faible: false, ecoule: false, alerte: null });
	});

	test('sous 5 minutes : temps faible', () => {
		expect(tempsRestant(debut, 45, apres(40, 1))).toMatchObject({ minutes: 4, secondes: 59, faible: true, ecoule: false });
	});

	test('à la fin : écoulé, jamais négatif', () => {
		expect(tempsRestant(debut, 45, apres(45))).toEqual({ minutes: 0, secondes: 0, faible: true, ecoule: true, alerte: null });
		expect(tempsRestant(debut, 45, apres(50))).toEqual({ minutes: 0, secondes: 0, faible: true, ecoule: true, alerte: null });
	});

	test('alertes : à 5 minutes de la fin, puis à 1 minute', () => {
		expect(tempsRestant(debut, 45, apres(39, 59)).alerte).toBeNull();
		expect(tempsRestant(debut, 45, apres(40)).alerte).toBe('Plus que 5 minutes.');
		expect(tempsRestant(debut, 45, apres(43, 59)).alerte).toBe('Plus que 5 minutes.');
		expect(tempsRestant(debut, 45, apres(44)).alerte).toBe('Plus qu’une minute.');
		expect(tempsRestant(debut, 45, apres(44, 59)).alerte).toBe('Plus qu’une minute.');
	});
});

describe('texteConfirmation', () => {
	test('questions sans réponse', () => {
		expect(texteConfirmation(19, 2)).toEqual({
			titre: '19 questions sans réponse. Terminer quand même ?',
			texte: '2 signalées à vérifier. Une fois terminé, vous ne pourrez plus modifier vos réponses.'
		});
	});

	test('toutes répondues', () => {
		expect(texteConfirmation(0, 1)).toEqual({
			titre: 'Terminer et voir votre score ?',
			texte: 'Toutes les questions ont une réponse, dont 1 signalée à vérifier. Une fois terminé, vous ne pourrez plus modifier vos réponses.'
		});
		expect(texteConfirmation(0, 0).texte).toBe(
			'Toutes les questions ont une réponse. Une fois terminé, vous ne pourrez plus modifier vos réponses.'
		);
	});

	test('accord au singulier, et rien sur les signalements quand il n’y en a pas', () => {
		expect(texteConfirmation(1, 0)).toEqual({
			titre: '1 question sans réponse. Terminer quand même ?',
			texte: 'Une fois terminé, vous ne pourrez plus modifier vos réponses.'
		});
	});
});

describe('prochaineSansReponse', () => {
	test('saute les questions répondues', () => {
		expect(prochaineSansReponse(new Set([1, 2, 4]), 1, 5)).toBe(3);
	});

	test('reprend au début si besoin', () => {
		expect(prochaineSansReponse(new Set([3, 4, 5]), 4, 5)).toBe(1);
	});

	test('null quand tout est répondu', () => {
		expect(prochaineSansReponse(new Set([1, 2, 3]), 2, 3)).toBeNull();
	});
});
