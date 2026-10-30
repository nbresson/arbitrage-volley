// Glossaire et figures : erreur de chargement visible, retraits confirmés, formulaire mis au premier plan.
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ glossaire: vi.fn(), figures: vi.fn(), supprimerTerme: vi.fn(), supprimerFigure: vi.fn() }));
vi.mock('$app/state', () => ({ page: { params: {}, url: new URL('http://x/formateur/glossaire') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), onNavigate: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: true, profil: null }, chargerProfil: vi.fn(), seDeconnecter: vi.fn() }));
vi.mock('#lib/data/seances.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/seances')>()), seanceEnCours: async () => false }));
vi.mock('#lib/data/regles.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/regles')>()),
	glossaire: h.glossaire,
	figures: h.figures,
	supprimerTerme: h.supprimerTerme,
	supprimerFigure: h.supprimerFigure,
	enregistrerTerme: vi.fn(),
	enregistrerFigure: vi.fn()
}));

import Page from '../../src/routes/formateur/glossaire/+page.svelte';

beforeEach(() => {
	vi.clearAllMocks();
	Element.prototype.scrollIntoView = vi.fn();
	h.glossaire.mockResolvedValue([{ id: 't1', terme: 'Libéro', definition: 'Joueur spécialiste de la défense.' }]);
	h.figures.mockResolvedValue([{ reference: 'Fig.9', legende: 'Positions', image_url: null }]);
	h.supprimerFigure.mockResolvedValue(undefined);
});

test('chargement en échec : message et Réessayer', async () => {
	h.glossaire.mockRejectedValueOnce(new Error('réseau'));
	const e = render(Page);
	expect(await e.findByText(/Le glossaire n’a pas pu être chargé/)).toBeInTheDocument();
	await fireEvent.click(e.getByRole('button', { name: 'Réessayer' }));
	expect(await e.findByText(/Joueur spécialiste de la défense/)).toBeInTheDocument();
});

test('« Retirer… » demande confirmation', async () => {
	const e = render(Page);
	await fireEvent.click(await e.findByRole('button', { name: 'Retirer Fig.9' }));
	expect(h.supprimerFigure).not.toHaveBeenCalled();
	expect(e.getByText(/disparaîtra aussi pour les stagiaires/)).toBeInTheDocument();
	await fireEvent.click(e.getByRole('button', { name: 'Retirer', hidden: true }));
	await waitFor(() => expect(h.supprimerFigure).toHaveBeenCalledWith('Fig.9'));
});

test('« Modifier » donne le focus au premier champ du formulaire', async () => {
	const e = render(Page);
	await fireEvent.click(await e.findByRole('button', { name: 'Modifier « Libéro »' }));
	const champ = e.getByLabelText('Terme') as HTMLInputElement;
	await waitFor(() => expect(document.activeElement).toBe(champ));
	expect(champ.value).toBe('Libéro');
	expect(e.getByText('Modification de « Libéro »')).toBeInTheDocument();
});
