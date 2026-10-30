import { describe, expect, test } from 'vitest';
import { actionGlobale, RACCOURCIS } from '../../src/lib/raccourcis-globaux';

const touche = (key: string, options: { saisie?: boolean; ctrl?: boolean } = {}) => ({ key, ctrlKey: !!options.ctrl, metaKey: false, altKey: false, saisie: !!options.saisie });

describe('actionGlobale', () => {
	test('« / » ouvre la recherche de règles, « ? » l’aide des raccourcis', () => {
		expect(actionGlobale(touche('/'))).toBe('recherche');
		expect(actionGlobale(touche('?'))).toBe('aide');
	});
	test('rien pendant une saisie ou avec Ctrl', () => {
		expect(actionGlobale(touche('/', { saisie: true }))).toBeNull();
		expect(actionGlobale(touche('?', { ctrl: true }))).toBeNull();
		expect(actionGlobale(touche('a'))).toBeNull();
	});
});

test('la liste des raccourcis couvre la navigation et la séance', () => {
	const touches = RACCOURCIS.flatMap((g) => g.raccourcis.map((r) => r.touches));
	expect(touches).toEqual(expect.arrayContaining(['/', '?', 'A à D ou 1 à 4', 'Entrée', 'S']));
});
