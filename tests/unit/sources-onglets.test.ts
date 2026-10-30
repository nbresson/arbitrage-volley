// Onglets des sources du panneau de décision : motif d'onglets complet au clavier.
import { fireEvent, render } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import SourcesOnglets from '../../src/lib/components/SourcesOnglets.svelte';

const source = (s: 'fivb_regles' | 'casebook', reference: string) => ({ source: s, edition: s === 'casebook' ? 'Casebook 2025' : 'Règles', reference, texte: 'Texte', texte_original: null, principale: s === 'fivb_regles' });
const sources = [source('fivb_regles', '12.4'), source('casebook', 'Cas 3.35')];

test('un seul onglet atteignable par Tab', () => {
	const e = render(SourcesOnglets, { sources });
	const [fivb, casebook] = e.getAllByRole('tab');
	expect(fivb.getAttribute('tabindex')).toBe('0');
	expect(casebook.getAttribute('tabindex')).toBe('-1');
});

test('flèche droite active l’onglet suivant et lui donne le focus', async () => {
	const e = render(SourcesOnglets, { sources });
	const [fivb, casebook] = e.getAllByRole('tab');
	fivb.focus();
	await fireEvent.keyDown(fivb, { key: 'ArrowRight' });
	expect(casebook).toHaveAttribute('aria-selected', 'true');
	expect(document.activeElement).toBe(casebook);
	await fireEvent.keyDown(casebook, { key: 'Home' });
	expect(fivb).toHaveAttribute('aria-selected', 'true');
});

test('le panneau est nommé par l’onglet actif et lui est relié', async () => {
	const e = render(SourcesOnglets, { sources });
	const [fivb] = e.getAllByRole('tab');
	const panneau = e.getByRole('tabpanel');
	expect(fivb.getAttribute('aria-controls')).toBe(panneau.id);
	expect(panneau).toHaveAccessibleName('Règles FIVB');
});
