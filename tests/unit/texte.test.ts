import { expect, test } from 'vitest';
import { pluriel, titreLisible } from '../../src/lib/domain/texte.ts';

test('pluriel : singulier à 0 et 1, pluriel au-delà', () => {
	expect(pluriel(0, 'acquise')).toBe('0 acquise');
	expect(pluriel(1, 'acquise')).toBe('1 acquise');
	expect(pluriel(2, 'acquise')).toBe('2 acquises');
	expect(pluriel(12, 'question travaillée', 'questions travaillées')).toBe('12 questions travaillées');
});

test('titre tout en capitales : remis en casse de phrase, sigles conservés', () => {
	expect(titreLisible('ÉCHELLE DE SANCTION')).toBe('Échelle de sanction');
	expect(titreLisible('COMPORTEMENT INCORRECT ET SANCTIONS')).toBe('Comportement incorrect et sanctions');
	expect(titreLisible('CHALLENGE VIDÉO FIVB')).toBe('Challenge vidéo FIVB');
});

test('titre déjà en casse normale : inchangé', () => {
	expect(titreLisible('Pénalisation')).toBe('Pénalisation');
	expect(titreLisible('Le libéro')).toBe('Le libéro');
	expect(titreLisible(null)).toBe('');
	expect(titreLisible('21')).toBe('21');
});
