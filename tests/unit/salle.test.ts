import { describe, expect, test } from 'vitest';
import { qualiteConnexion, saisirChiffres, texteEnAttente, texteFinAuto, texteRetablie } from '../../src/lib/examen-officiel/salle';

describe('qualiteConnexion', () => {
	test('trois réponses rapides : stable', () => {
		expect(qualiteConnexion([180, 240, 300])).toEqual({ etat: 'stable', texte: 'Connexion stable.' });
	});
	test('une réponse lente ou perdue : instable', () => {
		expect(qualiteConnexion([200, 2600, 300]).etat).toBe('instable');
		expect(qualiteConnexion([200, null, 300]).etat).toBe('instable');
		expect(qualiteConnexion([200, null, 300]).texte).toBe('Connexion instable : rapprochez-vous du Wi-Fi ou d’un endroit mieux couvert.');
	});
	test('aucune réponse : hors ligne', () => {
		expect(qualiteConnexion([null, null, null]).etat).toBe('hors_ligne');
	});
});

describe('textes de l’examen', () => {
	test('réponses en attente', () => {
		expect(texteEnAttente(2)).toBe('2 réponses en attente d’envoi');
		expect(texteEnAttente(1)).toBe('1 réponse en attente d’envoi');
	});
	test('fin automatique', () => {
		expect(texteFinAuto(8)).toBe('Temps écoulé : vos 8 réponses ont été envoyées.');
		expect(texteFinAuto(1)).toBe('Temps écoulé : votre réponse a été envoyée.');
		expect(texteFinAuto(0)).toBe('Temps écoulé : aucune réponse n’avait été donnée.');
	});
	test('connexion rétablie', () => {
		expect(texteRetablie(2)).toBe('Connexion rétablie, 2 réponses envoyées.');
		expect(texteRetablie(1)).toBe('Connexion rétablie, 1 réponse envoyée.');
		expect(texteRetablie(0)).toBe('Connexion rétablie.');
	});
});

describe('saisirChiffres (code en six cases)', () => {
	const vides = ['', '', '', '', '', ''];
	test('un chiffre remplit la case et passe à la suivante', () => {
		expect(saisirChiffres(vides, 0, '4')).toEqual({ cases: ['4', '', '', '', '', ''], focus: 1 });
	});
	test('une lettre est ignorée', () => {
		expect(saisirChiffres(vides, 0, 'a')).toEqual({ cases: vides, focus: 0 });
	});
	test('un code collé se répartit à partir de la case', () => {
		expect(saisirChiffres(vides, 0, '12 34-56')).toEqual({ cases: ['1', '2', '3', '4', '5', '6'], focus: 5 });
		expect(saisirChiffres(['9', '', '', '', '', ''], 1, '8765432')).toEqual({ cases: ['9', '8', '7', '6', '5', '4'], focus: 5 });
	});
	test('effacer vide la case', () => {
		expect(saisirChiffres(['1', '2', '', '', '', ''], 1, '')).toEqual({ cases: ['1', '', '', '', '', ''], focus: 1 });
	});
});
