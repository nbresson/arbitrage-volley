// Import assisté des consignes CFA : doublons non cochés d'office, consignes enregistrées retirées de la liste.
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ enregistrer: vi.fn(), consignes: [] as unknown[] }));
vi.mock('$app/state', () => ({ page: { params: {}, url: new URL('http://x/formateur/regles') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), onNavigate: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: true, profil: null }, chargerProfil: vi.fn(), seDeconnecter: vi.fn() }));
vi.mock('#lib/data/seances.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/seances')>()), seanceEnCours: async () => false }));
vi.mock('#lib/data/consignes.ts', () => ({
	editionsCfa: async () => [{ id: 'ed1', libelle: 'CFA 2025', active: true, consignes: 1 }],
	consignes: async () => h.consignes,
	enregistrerConsigne: h.enregistrer,
	creerEditionCfa: vi.fn(),
	activerEdition: vi.fn(),
	questionsLieesAuCfaActif: async () => 0,
	supprimerConsigne: vi.fn()
}));

import Page from '../../src/routes/formateur/regles/+page.svelte';

const COLLAGE = '1. Avant-match\nTexte un.\n2. Gestuelle\nTexte deux.\n2. Gestuelle bis\nTexte trois.\n3. Feuille\nTexte quatre.';

beforeEach(() => {
	vi.clearAllMocks();
	h.consignes = [{ id: 'c3', reference: 'CFA 3', titre: 'Feuille', texte: 'Déjà là.', citee: false }];
	h.enregistrer.mockResolvedValue(undefined);
});

async function decouper() {
	const e = render(Page);
	await fireEvent.input(await e.findByLabelText('Texte du document'), { target: { value: COLLAGE } });
	await fireEvent.click(e.getByRole('button', { name: 'Découper en consignes' }));
	const cases = () => [...document.querySelectorAll<HTMLInputElement>('.decoupees input[type=checkbox]')];
	return { e, cases };
}

test('doublons décochés d’office ; référence déjà présente jamais cochable', async () => {
	const { cases } = await decouper();
	expect(cases().map((c) => c.checked)).toEqual([true, false, false, false]);
	expect(cases()[3].disabled).toBe(true);
});

test('rattacher garde les cases décochées par le formateur', async () => {
	const { e, cases } = await decouper();
	await fireEvent.click(cases()[0]);
	expect(cases()[0].checked).toBe(false);
	await fireEvent.click(e.getAllByRole('button', { name: 'Rattacher à la précédente' })[1]);
	// La consigne fusionnée n'est plus en double : elle redevient cochée ; les autres gardent leur état.
	expect(cases().map((c) => c.checked)).toEqual([false, true, false]);
});

test('après l’ajout, seules les consignes en échec restent ; celles enregistrées disparaissent', async () => {
	const { e, cases } = await decouper();
	await fireEvent.click(cases()[1]);
	await fireEvent.click(cases()[2]);
	h.enregistrer.mockImplementation(async (_ed: string, f: { reference: string }) => {
		if (f.reference === 'CFA 2' && h.enregistrer.mock.calls.filter((c) => c[1].reference === 'CFA 2').length > 1) throw new Error('doublon');
	});
	await fireEvent.click(e.getByRole('button', { name: /^Ajouter 3 consigne/ }));
	await waitFor(() => expect(e.getByText(/2 consignes ajoutées/)).toBeInTheDocument());
	expect(cases()).toHaveLength(1);
	expect(e.getByText('Texte trois.')).toBeInTheDocument();
});
