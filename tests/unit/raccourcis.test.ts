import { expect, test } from 'vitest';
import { actionTouche } from '../../src/lib/seance/raccourcis.ts';

const avant = { nbPropositions: 4, corrigee: false, choix: false };
const apres = { nbPropositions: 4, corrigee: true, choix: true };

test('A à D et 1 à 4 choisissent une proposition tant que la question n’est pas corrigée', () => {
	expect(actionTouche('a', avant)).toEqual({ type: 'choisir', index: 0 });
	expect(actionTouche('D', avant)).toEqual({ type: 'choisir', index: 3 });
	expect(actionTouche('2', avant)).toEqual({ type: 'choisir', index: 1 });
	expect(actionTouche('e', avant)).toBeNull();
	expect(actionTouche('b', apres)).toBeNull();
});

test('Entrée valide seulement si une réponse est choisie', () => {
	expect(actionTouche('Enter', avant)).toBeNull();
	expect(actionTouche('Enter', { ...avant, choix: true })).toEqual({ type: 'valider' });
});

test('S passe à la question suivante après la correction', () => {
	expect(actionTouche('s', apres)).toEqual({ type: 'suivante' });
	expect(actionTouche('S', avant)).toBeNull();
});

test('une proposition absente ne se choisit pas', () => {
	expect(actionTouche('d', { ...avant, nbPropositions: 3 })).toBeNull();
});
