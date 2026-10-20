import { expect, test } from 'vitest';
import type { DetailTentative } from '../../src/lib/data/examens-formateur';
import { casesDetail, libelleErreurs } from '../../src/lib/formateur/fiche';

const detail: DetailTentative = {
	examen_id: 'e1', titre: 'Examen', date_heure: '2026-11-07T09:30:00Z', score: 1, total: 3, seuil: 2, reussi: false,
	questions: [
		{ ordre: 1, enonce: 'Q1', lettre: 'B', bonne_lettre: 'B', juste: true },
		{ ordre: 2, enonce: 'Q2', lettre: 'A', bonne_lettre: 'C', juste: false },
		{ ordre: 3, enonce: 'Q3', lettre: null, bonne_lettre: 'D', juste: false }
	],
	regles: []
};

test('casesDetail : une case par question, avec son libellé écrit', () => {
	expect(casesDetail(detail)).toEqual([
		{ n: 1, juste: true, aria: 'Question 1 : juste' },
		{ n: 2, juste: false, aria: 'Question 2 : fausse' },
		{ n: 3, juste: false, aria: 'Question 3 : sans réponse' }
	]);
});

test('libelleErreurs : singulier et pluriel', () => {
	expect(libelleErreurs(1)).toBe('1 erreur');
	expect(libelleErreurs(2)).toBe('2 erreurs');
});
