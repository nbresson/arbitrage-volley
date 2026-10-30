// Liste des règles : recherche dans toutes les sources, Mes règles, état gardé dans l'adresse.
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ url: new URL('http://x/regles'), replaceState: vi.fn(), epinglees: [] as string[] }));
const regle = (reference: string, source: 'fivb_regles' | 'casebook', texte: string) => ({
	id: `id-${reference}`, edition: source === 'casebook' ? 'Casebook 2025' : 'Règles officielles', source, reference, parent_reference: null, titre: null, texte, texte_original: null, renvois: [], video_url: null
});
vi.mock('$app/state', () => ({ page: { get url() { return h.url; }, params: {} } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), onNavigate: vi.fn(), replaceState: h.replaceState }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: true, profil: null }, chargerProfil: vi.fn(), seDeconnecter: vi.fn() }));
vi.mock('#lib/data/regles.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/regles')>()),
	toutesLesRegles: async () => [regle('12.4', 'fivb_regles', 'Le libéro ne peut pas servir.'), regle('Cas 3.35', 'casebook', 'Le libéro entre en jeu.'), regle('Cas 3.36', 'casebook', 'Un autre cas.')],
	mesEpingles: async () => h.epinglees
}));

import Regles from '../../src/routes/regles/+page.svelte';

beforeEach(() => {
	vi.clearAllMocks();
	h.url = new URL('http://x/regles');
	h.epinglees = [];
});

test('une recherche active couvre toutes les sources', async () => {
	const e = render(Regles);
	await fireEvent.input(await e.findByLabelText(/Chercher un numéro ou des mots/), { target: { value: 'Cas 3.35' } });
	expect(await e.findByRole('link', { name: /^Cas 3\.35/ })).toBeInTheDocument();
	expect(e.getByText('Casebook', { selector: '.badge' })).toBeInTheDocument();
});

test('onglets : compte par source pendant une recherche', async () => {
	const e = render(Regles);
	await fireEvent.input(await e.findByLabelText(/Chercher un numéro ou des mots/), { target: { value: 'libéro' } });
	expect(await e.findByRole('tab', { name: /Casebook.*\(1\)/ })).toBeInTheDocument();
	expect(e.getByRole('tab', { name: /^Règles officielles.*\(1\)/ })).toBeInTheDocument();
	expect(e.getAllByRole('link', { name: /^(12\.4|Cas 3\.35)/ })).toHaveLength(2);
});

test('Mes règles : la recherche ne porte que sur les règles épinglées', async () => {
	h.epinglees = ['id-Cas 3.36'];
	h.url = new URL('http://x/regles?vue=mes-regles');
	const e = render(Regles);
	await fireEvent.input(await e.findByLabelText(/Chercher un numéro ou des mots/), { target: { value: 'cas' } });
	await e.findByRole('status');
	await waitFor(() => expect(e.queryByRole('link', { name: /^Cas 3\.35/ })).toBeNull());
	expect(e.getByRole('link', { name: /^Cas 3\.36/ })).toBeInTheDocument();
});

test('vue et recherche relues depuis l’adresse', async () => {
	h.url = new URL('http://x/regles?vue=casebook&q=libero');
	const e = render(Regles);
	expect(await e.findByRole('tab', { name: /Casebook/, selected: true })).toBeInTheDocument();
	expect(e.getByLabelText(/Chercher un numéro ou des mots/)).toHaveValue('libero');
});

test('vue et recherche écrites dans l’adresse', async () => {
	const e = render(Regles);
	await fireEvent.click(await e.findByRole('tab', { name: /Casebook/ }));
	await fireEvent.input(e.getByLabelText(/Chercher un numéro ou des mots/), { target: { value: 'libero' } });
	await waitFor(() => expect(h.replaceState).toHaveBeenLastCalledWith('?vue=casebook&q=libero', {}));
});

test('chaque résultat est un seul lien sur toute la ligne', async () => {
	const e = render(Regles);
	await fireEvent.input(await e.findByLabelText(/Chercher un numéro ou des mots/), { target: { value: 'libéro' } });
	const lien = await e.findByRole('link', { name: /12\.4.*Le libéro ne peut pas servir/ });
	expect(lien.classList.contains('ligne')).toBe(true);
});
