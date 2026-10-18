import { describe, expect, test } from 'vitest';
import { chercher, comparerReferences, construireArbre, type Regle } from '../../src/lib/regles/arbre';

const regle = (reference: string, texte = '', source: Regle['source'] = 'fivb_regles'): Regle => ({
	id: reference,
	edition: 'Règles officielles 2025-2028',
	source,
	reference,
	parent_reference: reference.includes('.') ? reference.slice(0, reference.lastIndexOf('.')) : null,
	titre: null,
	texte,
	texte_original: null,
	renvois: [],
	video_url: null
});

const regles = [
	regle('19.10', 'Dernier article'),
	regle('19', 'Le joueur Libéro'),
	regle('19.3.1.4', 'Un joueur ne peut effectuer une frappe d’attaque… passe haute du Libéro'),
	regle('19.9', 'Avant-dernier'),
	regle('19.3', 'Actions impliquant le libéro')
];

describe('construireArbre', () => {
	test('tri numérique des enfants : 19.3, 19.9, 19.10', () => {
		const [racine] = construireArbre(regles);
		expect(racine.regle.reference).toBe('19');
		expect(racine.enfants.map((n) => n.regle.reference)).toEqual(['19.3', '19.9', '19.10']);
	});

	test('un article dont le parent manque se rattache au plus proche ancêtre existant', () => {
		const [racine] = construireArbre(regles);
		const n193 = racine.enfants[0];
		expect(n193.enfants.map((n) => n.regle.reference)).toEqual(['19.3.1.4']);
	});

	test('comparerReferences ordonne les cas du Casebook numériquement', () => {
		expect(['Cas 3.10', 'Cas 3.9', 'Cas 3.35.1'].sort(comparerReferences)).toEqual(['Cas 3.9', 'Cas 3.10', 'Cas 3.35.1']);
	});
});

describe('chercher', () => {
	test('un numéro cherche par préfixe de référence, sans déborder sur 19.10', () => {
		expect(chercher(regles, '19.3').map((r) => r.reference)).toEqual(['19.3', '19.3.1.4']);
	});

	test('les mots cherchent dans le texte sans tenir compte des accents ni de la casse', () => {
		expect(chercher(regles, 'libero').map((r) => r.reference)).toEqual(['19', '19.3', '19.3.1.4']);
	});

	test('« Cas 3.35 » trouve le cas et ses sous-cas', () => {
		const cas = [regle('Cas 3.35', '', 'casebook'), regle('Cas 3.35.1', '', 'casebook'), regle('Cas 3.3', '', 'casebook')];
		expect(chercher(cas, 'Cas 3.35').map((r) => r.reference)).toEqual(['Cas 3.35', 'Cas 3.35.1']);
		expect(chercher(cas, 'cas 3.35').map((r) => r.reference)).toEqual(['Cas 3.35', 'Cas 3.35.1']);
	});

	test('plusieurs mots : tous doivent être présents', () => {
		expect(chercher(regles, 'passe libero').map((r) => r.reference)).toEqual(['19.3.1.4']);
	});

	test('requête vide : aucun résultat', () => {
		expect(chercher(regles, '   ')).toEqual([]);
	});
});
