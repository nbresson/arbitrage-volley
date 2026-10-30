import { expect, test } from 'vitest';
import { annonceCompteurs } from '../../src/lib/domain/annonce';

const c = (acquises: number, aRevoir: number, q = 1) => [
	{ libelle: 'Question / 20', valeur: q },
	{ libelle: 'Acquises', valeur: acquises },
	{ libelle: 'À revoir', valeur: aRevoir }
];

test('seul le compteur qui change est annoncé, jamais le numéro de question', () => {
	expect(annonceCompteurs(c(4, 1), c(5, 1, 2))).toBe('5 acquises');
	expect(annonceCompteurs(c(5, 1), c(5, 2, 3))).toBe('2 à revoir');
	expect(annonceCompteurs(c(5, 1), c(5, 1, 4))).toBe('');
});

test('premier affichage : rien à annoncer', () => {
	expect(annonceCompteurs(null, c(0, 0))).toBe('');
});
