import { expect, test } from 'vitest';
import { validerConsigne } from '../../src/lib/formateur/validation-consigne';

const correcte = { reference: 'CFA 3.2', titre: 'Protocole de vérification vidéo', texte: 'Le premier arbitre…' };

test('consigne correcte : aucune erreur', () => {
	expect(validerConsigne(correcte, ['CFA 1.1'])).toEqual({});
});

test.each([
	[{ reference: ' ' }, 'reference', 'Indiquez la référence.'],
	[{ texte: '' }, 'texte', 'Rédigez le texte de la consigne.'],
	[{ reference: 'CFA 1.1' }, 'reference', 'Cette référence existe déjà dans cette édition.'],
	[{ reference: ' cfa 1.1 ' }, 'reference', 'Cette référence existe déjà dans cette édition.']
] as const)('%o → %s', (diff, champ, message) => {
	expect(validerConsigne({ ...correcte, ...diff }, ['CFA 1.1'])).toEqual({ [champ]: message });
});
