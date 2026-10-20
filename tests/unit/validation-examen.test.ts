import { describe, expect, test } from 'vitest';
import { seuilParDefaut, validerExamen, type FormulaireExamen } from '../../src/lib/formateur/validation-examen';

const correct: FormulaireExamen = { titre: 'Examen de fin de module', dateHeure: '2026-11-07T09:30', lieu: 'Salle 2', dureeMinutes: 45, seuil: 2 };

describe('validerExamen', () => {
	test('formulaire correct : aucune erreur', () => {
		expect(validerExamen(correct, 3)).toEqual({});
	});

	test.each([
		[{ titre: '  ' }, 'titre', 'Donnez un titre à l’examen.'],
		[{ dateHeure: '' }, 'dateHeure', 'Choisissez la date et l’heure.'],
		[{ dureeMinutes: null }, 'dureeMinutes', 'La durée doit être comprise entre 1 et 240 minutes.'],
		[{ dureeMinutes: 0 }, 'dureeMinutes', 'La durée doit être comprise entre 1 et 240 minutes.'],
		[{ dureeMinutes: 241 }, 'dureeMinutes', 'La durée doit être comprise entre 1 et 240 minutes.'],
		[{ seuil: null }, 'seuil', 'Indiquez le seuil de réussite.'],
		[{ seuil: 0 }, 'seuil', 'Indiquez le seuil de réussite.'],
		[{ seuil: 4 }, 'seuil', 'Le seuil dépasse le nombre de questions (3).']
	] as const)('%o → %s', (diff, champ, message) => {
		expect(validerExamen({ ...correct, ...diff }, 3)).toEqual({ [champ]: message });
	});

	test('sans question choisie, le seuil n’est pas comparé', () => {
		expect(validerExamen({ ...correct, seuil: 21 }, 0)).toEqual({});
	});
});

describe('seuilParDefaut', () => {
	test('70 % arrondi au-dessus, au moins 1', () => {
		expect(seuilParDefaut(30)).toBe(21);
		expect(seuilParDefaut(1)).toBe(1);
		expect(seuilParDefaut(0)).toBe(1);
	});
});

describe('versChampDate', () => {
	test('aller-retour avec le champ datetime-local', async () => {
		const { versChampDate } = await import('../../src/lib/formateur/validation-examen');
		expect(versChampDate(new Date('2026-11-07T09:30').toISOString())).toBe('2026-11-07T09:30');
	});
});
