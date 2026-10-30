import { expect, test } from 'vitest';
import { decouperConsignes } from '../../src/lib/formateur/decoupage-cfa';

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
		{ reference: '1', titre: 'Protocole d’avant-match', texte: 'Les arbitres arrivent une heure avant.\nIls contrôlent le terrain.' },
		{ reference: '1.2', titre: 'Tirage au sort', texte: 'Le tirage a lieu 15 minutes avant.' },
		{ reference: '2', titre: 'Gestuelle', texte: 'Le premier arbitre siffle puis montre la faute.' }
	]);
});

test('« Consigne 3 » ou « Article 4 » comme numéro ; une ligne longue sans titre devient le texte', () => {
	expect(decouperConsignes('Consigne 3 : Le marqueur vérifie les licences avant le match et signe la feuille.\nArticle 4\nTexte de l’article.')).toEqual([
		{ reference: '3', titre: '', texte: 'Le marqueur vérifie les licences avant le match et signe la feuille.' },
		{ reference: '4', titre: '', texte: 'Texte de l’article.' }
	]);
});

test('sans numéro : rien à découper', () => {
	expect(decouperConsignes('Un texte sans numérotation.')).toEqual([]);
});
