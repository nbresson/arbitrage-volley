// Liste des stagiaires : états des courbes, tri, promotion signalée.
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ seances: vi.fn(), creer: vi.fn(), promotion: vi.fn() }));
vi.mock('$app/state', () => ({ page: { params: {}, url: new URL('http://x/formateur/stagiaires') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), onNavigate: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({
	session: { pret: true, profil: { id: 'f1', prenom: 'Ana', nom: 'F', role: 'formateur', profil_formation: 'arbitre', niveau_id: 'n1', notice_acceptee_le: '2026-10-01', actif: true } },
	chargerProfil: vi.fn(),
	seDeconnecter: vi.fn()
}));
vi.mock('#lib/data/seances.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/seances')>()),
	referentiel: async () => ({ themes: [], niveaux: [{ id: 'n1', libelle: 'Niveau 1' }] }),
	seanceEnCours: async () => false
}));
vi.mock('#lib/data/stagiaires.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/stagiaires')>()),
	listerComptes: async () => [{ id: 's1', prenom: 'Lou', nom: 'Essai', email: 'lou@x.fr', role: 'stagiaire', profil_formation: 'arbitre', niveau_id: 'n1', actif: true, promotion: null }],
	seancesRecentes: h.seances,
	activiteStagiaires: async () => new Map(),
	creerCompte: h.creer,
	promotionParEmail: h.promotion
}));

import Page from '../../src/routes/formateur/stagiaires/+page.svelte';

beforeEach(() => {
	vi.clearAllMocks();
	h.seances.mockResolvedValue([]);
	h.creer.mockResolvedValue({ ok: true });
	h.promotion.mockResolvedValue(undefined);
});

test('courbes en chargement : « … » et tri par réussite désactivé', async () => {
	h.seances.mockReturnValue(new Promise(() => {}));
	const e = render(Page);
	await e.findByText('Lou Essai');
	expect(e.getByText('…')).toBeInTheDocument();
	expect(e.queryByText('Aucune séance')).toBeNull();
	expect(e.getByRole('option', { name: /Réussite/ })).toBeDisabled();
});

test('courbes en échec : « Courbes indisponibles » et Réessayer', async () => {
	h.seances.mockRejectedValueOnce(new Error('réseau')).mockResolvedValue([]);
	const e = render(Page);
	expect(await e.findByText(/Courbes indisponibles/)).toBeInTheDocument();
	expect(e.queryByText('Aucune séance')).toBeNull();
	await fireEvent.click(e.getByRole('button', { name: 'Réessayer' }));
	await waitFor(() => expect(h.seances).toHaveBeenCalledTimes(2));
	expect(await e.findByText('Aucune séance')).toBeInTheDocument();
});

test('promotion non enregistrée : le message le dit', async () => {
	h.promotion.mockRejectedValue(new Error('x'));
	const e = render(Page);
	await e.findByText('Lou Essai');
	await fireEvent.input(e.getByLabelText('Prénom'), { target: { value: 'Camille' } });
	await fireEvent.input(e.getByLabelText('Nom'), { target: { value: 'Martin' } });
	await fireEvent.input(e.getByLabelText('Adresse e-mail'), { target: { value: 'camille@exemple.fr' } });
	await fireEvent.input(e.getAllByLabelText(/^Promotion/)[0], { target: { value: 'Automne' } });
	await fireEvent.change(e.getAllByLabelText('Niveau')[0], { target: { value: 'n1' } });
	await fireEvent.click(e.getByLabelText('Personne majeure'));
	await fireEvent.click(e.getByRole('button', { name: 'Créer le compte' }));
	expect(await e.findByText(/Compte créé, mais la promotion n’a pas été enregistrée : ajoutez-la depuis sa fiche\./)).toBeInTheDocument();
});
