import { render } from '@testing-library/svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Compteur from '../../src/lib/components/Compteur.svelte';

const mouvementReduit = (actif: boolean) =>
	vi.stubGlobal(
		'matchMedia',
		vi.fn((q: string) => ({ matches: actif && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }))
	);

const volets = (c: HTMLElement) => [...c.querySelectorAll('.volet')] as HTMLElement[];

afterEach(() => vi.unstubAllGlobals());

describe('Compteur', () => {
	test('affiche un volet par chiffre, complété par des zéros, et son libellé', () => {
		mouvementReduit(false);
		const { container, getByText } = render(Compteur, { valeur: 7, chiffres: 2, libelle: 'Question / 20' });
		expect(volets(container).map((v) => v.textContent?.trim())).toEqual(['0', '7']);
		expect(getByText('Question / 20')).toBeInTheDocument();
	});

	test('quand la valeur passe de 5 à 6, seul le volet des unités tourne', async () => {
		mouvementReduit(false);
		const { container, rerender } = render(Compteur, { valeur: 5, chiffres: 2, libelle: 'Acquises' });
		await rerender({ valeur: 6, chiffres: 2, libelle: 'Acquises' });
		const [dizaines, unites] = volets(container);
		expect(dizaines).not.toHaveClass('tourne');
		expect(unites).toHaveClass('tourne');
	});

	test('aucune rotation avec prefers-reduced-motion', async () => {
		mouvementReduit(true);
		const { container, rerender } = render(Compteur, { valeur: 5, chiffres: 2, libelle: 'Acquises' });
		await rerender({ valeur: 6, chiffres: 2, libelle: 'Acquises' });
		expect(volets(container).some((v) => v.classList.contains('tourne'))).toBe(false);
	});

	test('les volets sont masqués aux lecteurs d’écran', () => {
		mouvementReduit(false);
		const { container } = render(Compteur, { valeur: 12, chiffres: 2, libelle: 'Répondues' });
		expect(container.querySelector('[aria-hidden="true"] .volet')).not.toBeNull();
	});
});
