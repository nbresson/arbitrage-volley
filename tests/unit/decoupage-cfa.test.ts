import { expect, test } from 'vitest';
import { decouperConsignes, rattacherALaPrecedente } from '../../src/lib/formateur/decoupage-cfa';

test('une consigne par numéro en début de ligne ; le titre court sur la ligne du numéro, le texte ensuite', () => {
	const texte = `Consignes CFA 2025
1. Protocole d’avant-match
Les arbitres arrivent une heure avant.
Ils contrôlent le terrain.
1.2 Tirage au sort
Le tirage a lieu 15 minutes avant.
2 - Gestuelle
Le premier arbitre siffle puis montre la faute.`;
	expect(decouperConsignes(texte)).toEqual([
		{ reference: '1', titre: 'Protocole d’avant-match', texte: 'Les arbitres arrivent une heure avant.\nIls contrôlent le terrain.', doublon: false },
		{ reference: '1.2', titre: 'Tirage au sort', texte: 'Le tirage a lieu 15 minutes avant.', doublon: false },
		{ reference: '2', titre: 'Gestuelle', texte: 'Le premier arbitre siffle puis montre la faute.', doublon: false }
	]);
});

test('« Consigne 3 » ou « Article 4 » comme numéro ; une ligne longue sans titre devient le texte', () => {
	expect(decouperConsignes('Consigne 3 : Le marqueur vérifie les licences avant le match et signe la feuille.\nArticle 4\nTexte de l’article.')).toEqual([
		{ reference: '3', titre: '', texte: 'Le marqueur vérifie les licences avant le match et signe la feuille.', doublon: false },
		{ reference: '4', titre: '', texte: 'Texte de l’article.', doublon: false }
	]);
});

test('sans numéro : rien à découper', () => {
	expect(decouperConsignes('Un texte sans numérotation.')).toEqual([]);
});

test('« 2 joueurs se gênent » ne commence pas une consigne', () => {
	expect(decouperConsignes('1. Gêne\nQuand deux équipes jouent :\n2 joueurs se gênent au filet.')).toEqual([
		{ reference: '1', titre: 'Gêne', texte: 'Quand deux équipes jouent :\n2 joueurs se gênent au filet.', doublon: false }
	]);
});

test('numéros en double dans le collage signalés', () => {
	const l = decouperConsignes('1. Avant-match\nTexte un.\n2. Gestuelle\nTexte deux.\n2. Gestuelle bis\nTexte trois.');
	expect(l.map((c) => [c.reference, c.doublon])).toEqual([
		['1', false],
		['2', true],
		['2', true]
	]);
});

test('rattacher fusionne le texte avec la consigne précédente', () => {
	const l = decouperConsignes('1. Gêne\nTexte un.\n3.5 mètres séparent les joueurs.\n2. Autre\nTexte deux.');
	expect(l.map((c) => c.reference)).toEqual(['1', '3.5', '2']);
	expect(rattacherALaPrecedente(l, 1)).toEqual([
		{ reference: '1', titre: 'Gêne', texte: 'Texte un.\n3.5 mètres séparent les joueurs.', doublon: false },
		{ reference: '2', titre: 'Autre', texte: 'Texte deux.', doublon: false }
	]);
});
