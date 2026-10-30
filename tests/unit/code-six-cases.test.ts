// Code d'accès en six cases : un chiffre par case, avance automatique, collage réparti.
import { fireEvent, render } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import CodeSixCases from '../../src/lib/components/CodeSixCases.svelte';

const valeurs = (cases: HTMLInputElement[]) => cases.map((c) => c.value).join('');

test('six cases numériques, nommées pour les lecteurs d’écran', () => {
	const ecran = render(CodeSixCases, { libelle: 'Code d’accès' });
	const cases = ecran.getAllByRole('textbox') as HTMLInputElement[];
	expect(cases).toHaveLength(6);
	expect(cases[0].getAttribute('inputmode')).toBe('numeric');
	expect(ecran.getByRole('group', { name: 'Code d’accès' })).toBeInTheDocument();
	expect(ecran.getByLabelText('Chiffre 3 sur 6')).toBe(cases[2]);
});

test('un chiffre passe à la case suivante, un code collé remplit tout', async () => {
	const ecran = render(CodeSixCases, { libelle: 'Code' });
	const cases = ecran.getAllByRole('textbox') as HTMLInputElement[];
	await fireEvent.input(cases[0], { target: { value: '4' } });
	expect(document.activeElement).toBe(cases[1]);
	const collage = new Event('paste', { bubbles: true, cancelable: true }) as Event & { clipboardData: unknown };
	collage.clipboardData = { getData: () => '12 34 56' };
	await fireEvent(cases[0], collage);
	expect(valeurs(cases)).toBe('123456');
});

test('retour arrière sur une case vide efface la précédente', async () => {
	const ecran = render(CodeSixCases, { libelle: 'Code', valeur: '12' });
	const cases = ecran.getAllByRole('textbox') as HTMLInputElement[];
	cases[2].focus();
	await fireEvent.keyDown(cases[2], { key: 'Backspace' });
	expect(valeurs(cases)).toBe('1');
	expect(document.activeElement).toBe(cases[1]);
});
