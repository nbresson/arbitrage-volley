// Fiche d'une règle : questions liées, glossaire, figures, voisines, marque-page.
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ params: { edition: 'regles', reference: '21.3' } as Record<string, string>, epingler: vi.fn(async () => {}), nb: 2 }));
const r = (reference: string, parent_reference: string | null, texte = 'Texte', renvois: string[] = []) => ({
	id: `id-${reference}`, edition: 'Règles', source: 'fivb_regles', reference, parent_reference, titre: null, texte, texte_original: null, renvois, video_url: null
});
vi.mock('$app/state', () => ({ page: { get params() { return h.params; }, url: new URL('http://x/') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: true, profil: null }, chargerProfil: vi.fn(), seDeconnecter: vi.fn() }));
vi.mock('#lib/data/regles.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/regles')>()),
	toutesLesRegles: async () => [r('21', null), r('21.1', '21'), r('21.3', '21', 'Le libéro ne peut pas servir.', ['Fig.9', '99.9']), r('22', null)],
	glossaire: async () => [{ id: 'g1', terme: 'libéro', definition: 'Joueur spécialiste de la défense.' }],
	figures: async () => [{ reference: 'Fig.9', legende: 'Positions au service', image_url: null }],
	mesEpingles: async () => [],
	epingler: h.epingler,
	nbQuestionsRegle: async () => h.nb
}));

import Page from '../../src/routes/regles/[edition]/[reference]/+page.svelte';

beforeEach(() => vi.clearAllMocks());

test('questions liées, glossaire, figure sans image, renvoi absent, voisines', async () => {
	const ecran = render(Page);
	expect(await ecran.findByText('2 questions citent cette règle.')).toBeInTheDocument();
	expect(ecran.getByRole('link', { name: 'S’entraîner sur ces 2 questions' })).toBeInTheDocument();
	expect(ecran.getByRole('button', { name: 'libéro' })).toHaveAccessibleDescription('Joueur spécialiste de la défense.');
	expect(ecran.getByText(/Figure 9 du règlement : Positions au service/)).toBeInTheDocument();
	expect(ecran.getByText('Article absent de cette édition')).toBeInTheDocument();
	expect(ecran.getByRole('link', { name: /Précédente 21\.1/ })).toBeInTheDocument();
	expect(ecran.getByRole('link', { name: /Suivante 22/ })).toBeInTheDocument();
	expect(ecran.getByRole('navigation', { name: 'Sommaire du chapitre' })).toBeInTheDocument();
});

test('épingler la règle', async () => {
	const ecran = render(Page);
	const bouton = await ecran.findByRole('button', { name: 'Épingler' });
	await fireEvent.click(bouton);
	await waitFor(() => expect(h.epingler).toHaveBeenCalledWith('id-21.3', true));
	expect(ecran.getByRole('button', { name: 'Épinglée dans Mes règles' })).toHaveAttribute('aria-pressed', 'true');
});

test('aucune question : pas de bouton d’entraînement', async () => {
	h.nb = 0;
	const ecran = render(Page);
	expect(await ecran.findByText('Aucune question ne cite encore cette règle.')).toBeInTheDocument();
	expect(ecran.queryByRole('link', { name: /S’entraîner sur/ })).toBeNull();
	h.nb = 2;
});
