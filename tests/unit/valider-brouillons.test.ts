import { describe, expect, test } from 'vitest';
import type { BrouillonQuestion, CasImport, RegleImport } from '../../src/lib/domain/types';
import { validerBrouillons } from '../../scripts/import/brouillons/valider-brouillons';

const regle = (reference: string): RegleImport => ({
	reference,
	parent_reference: null,
	titre: null,
	texte: 't',
	renvois: [],
	ordre: 0
});
const cas = (reference: string): CasImport => ({
	reference,
	chapitre: 'Actions de jeu',
	rubrique: null,
	mention_2025: null,
	video_url: null,
	situation: 's',
	decision: 'd',
	regles_citees: [],
	texte_original: 'o',
	ordre: 0
});
const regles = [regle('13.3.6'), regle('19.3.1.4')];
const tousLesCas = [cas('Cas 3.35.1'), cas('Cas 1.1')];

const bon = (): BrouillonQuestion => ({
	cas: 'Cas 3.35.1',
	enonce: 'Le Libéro… Quelle est votre décision ?',
	propositions: [
		{ lettre: 'A', texte: 'Jeu continue', correcte: false },
		{ lettre: 'B', texte: "Faute de l'attaquant", correcte: true },
		{ lettre: 'C', texte: 'Faute du Libéro', correcte: false },
		{ lettre: 'D', texte: 'Faute de position', correcte: false }
	],
	explication: 'Passe haute des doigts du Libéro en zone avant.',
	theme: "Frappe d'attaque",
	niveau: 'Niveau 2',
	role_cible: 'arbitre',
	regles: ['19.3.1.4', '13.3.6', 'Cas 3.35.1'],
	regle_principale: '19.3.1.4'
});
const sansCas11 = { cas: 'Cas 1.1', sans_question: true as const, raison: 'question ouverte' };
const erreurs = (b: unknown[]) =>
	validerBrouillons(b as never, tousLesCas, regles).filter((p) => p.gravite === 'erreur').map((p) => p.message);

describe('validerBrouillons', () => {
	test('une entrée correcte ne produit aucun problème', () => {
		expect(validerBrouillons([bon(), sansCas11], tousLesCas, regles)).toEqual([]);
	});

	test('erreur si les propositions ne sont pas exactement A, B, C, D', () => {
		const b = bon();
		b.propositions = b.propositions.slice(0, 3);
		expect(erreurs([b, sansCas11])).toContain('Il faut 4 propositions A, B, C, D.');
		const c = bon();
		c.propositions[3].lettre = 'C';
		expect(erreurs([c, sansCas11])).toContain('Il faut 4 propositions A, B, C, D.');
	});

	test('erreur si le nombre de bonnes réponses est différent de 1', () => {
		const b = bon();
		b.propositions[0].correcte = true;
		expect(erreurs([b, sansCas11])).toContain('Il faut exactement une bonne réponse.');
		const c = bon();
		c.propositions[1].correcte = false;
		expect(erreurs([c, sansCas11])).toContain('Il faut exactement une bonne réponse.');
	});

	test('erreur si le cas est inconnu', () => {
		expect(erreurs([{ ...bon(), cas: 'Cas 99.9' }, sansCas11])).toContain('Cas inconnu dans le Casebook.');
	});

	test('erreur si un cas apparaît deux fois', () => {
		expect(erreurs([bon(), bon(), sansCas11])).toContain('Cas traité plusieurs fois.');
	});

	test('erreur si la règle principale n’est pas parmi les règles liées', () => {
		expect(erreurs([{ ...bon(), regle_principale: '12.4.4' }, sansCas11])).toContain(
			'La règle principale doit faire partie des règles liées.'
		);
	});

	test('erreur si énoncé, explication, thème ou niveau sont vides', () => {
		expect(erreurs([{ ...bon(), enonce: '  ' }, sansCas11])).toContain("L'énoncé est vide.");
		expect(erreurs([{ ...bon(), explication: '' }, sansCas11])).toContain("L'explication est vide.");
		expect(erreurs([{ ...bon(), theme: '' }, sansCas11])).toContain('Le thème est vide.');
		expect(erreurs([{ ...bon(), niveau: '' }, sansCas11])).toContain('Le niveau est vide.');
	});

	test('erreur si une proposition est vide', () => {
		const b = bon();
		b.propositions[2].texte = ' ';
		expect(erreurs([b, sansCas11])).toContain('Une proposition est vide.');
	});

	test('avertissement (pas erreur) pour une figure ou une règle absente de l’import', () => {
		const b = { ...bon(), regles: ['19.3.1.4', 'Fig.1b', '99.1', 'Cas 3.35.1'] };
		const p = validerBrouillons([b, sansCas11], tousLesCas, regles);
		expect(p.filter((x) => x.gravite === 'erreur')).toEqual([]);
		expect(p).toContainEqual({ cas: 'Cas 3.35.1', gravite: 'avertissement', message: 'Référence non liable : Fig.1b' });
		expect(p).toContainEqual({ cas: 'Cas 3.35.1', gravite: 'avertissement', message: 'Référence non liable : 99.1' });
	});

	test('avertissement listant les cas ni traités ni marqués sans question', () => {
		expect(validerBrouillons([bon()], tousLesCas, regles)).toContainEqual({
			cas: 'Cas 1.1',
			gravite: 'avertissement',
			message: 'Cas non traité.'
		});
	});

	test('erreur si role_cible est inconnu ou si une raison manque', () => {
		expect(erreurs([{ ...bon(), role_cible: 'joueur' }, sansCas11])).toContain('Rôle cible inconnu.');
		expect(erreurs([bon(), { ...sansCas11, raison: '' }])).toContain('Raison manquante.');
	});
});
