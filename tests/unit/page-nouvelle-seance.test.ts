// Nouvelle séance : sortir d'une impasse, bornes annoncées, thème choisi pendant le chargement.
import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ url: new URL('http://x/entrainement/nouvelle'), creer: vi.fn(), referentiel: vi.fn() }));
vi.mock('$app/state', () => ({ page: { get url() { return h.url; }, params: {} } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), onNavigate: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({
	session: { pret: true, profil: { id: 'u1', prenom: 'C', nom: 'E', role: 'stagiaire', profil_formation: 'arbitre', niveau_id: 'n1', notice_acceptee_le: '2026-10-01', actif: true } },
	chargerProfil: vi.fn(),
	seDeconnecter: vi.fn()
}));
vi.mock('#lib/data/seances.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/seances')>()), creerSeance: h.creer, referentiel: h.referentiel, seanceEnCours: async () => false }));

import Page from '../../src/routes/entrainement/nouvelle/+page.svelte';

beforeEach(() => {
	vi.clearAllMocks();
	h.url = new URL('http://x/entrainement/nouvelle');
	h.referentiel.mockResolvedValue({ themes: [{ id: 't1', libelle: 'Service' }], niveaux: [{ id: 'n1', libelle: 'Niveau 1' }] });
});

test('aucune question : réglages ouverts et un bouton par élargissement', async () => {
	h.url = new URL('http://x/entrainement/nouvelle?theme=t1');
	h.creer.mockRejectedValue(new Error('Aucune question ne correspond à ces critères.'));
	const e = render(Page);
	await e.findByText(/Service/);
	await fireEvent.click(e.getByRole('button', { name: 'Commencer la séance' }));
	expect(await e.findByRole('button', { name: 'Tous les niveaux' })).toBeInTheDocument();
	expect(e.getByRole('button', { name: 'Tous les thèmes' })).toBeInTheDocument();
	expect(e.getByRole('button', { name: 'Arbitre et marqueur' })).toBeInTheDocument();
	expect(e.getByLabelText(/Nombre de questions/)).toBeInTheDocument();
});

test('nombre hors bornes : erreur en ligne, pas de correction silencieuse', async () => {
	const e = render(Page);
	await e.findByLabelText(/Nombre de questions/);
	await fireEvent.input(e.getByLabelText(/Nombre de questions/), { target: { value: '3' } });
	await fireEvent.click(e.getByRole('button', { name: 'Commencer la séance' }));
	expect(await e.findByText('Entre 5 et 50 questions.')).toBeInTheDocument();
	expect(h.creer).not.toHaveBeenCalled();
});

test('examen blanc : durée hors bornes refusée', async () => {
	h.url = new URL('http://x/entrainement/nouvelle?mode=examen_entrainement');
	const e = render(Page);
	await fireEvent.input(await e.findByLabelText(/Durée/), { target: { value: '300' } });
	await fireEvent.click(e.getByRole('button', { name: 'Commencer la séance' }));
	expect(await e.findByText('Entre 5 et 120 minutes.')).toBeInTheDocument();
	expect(h.creer).not.toHaveBeenCalled();
});

test('pendant le chargement des thèmes : « Chargement du thème… » et lancement désactivé', () => {
	h.url = new URL('http://x/entrainement/nouvelle?theme=t1');
	h.referentiel.mockReturnValue(new Promise(() => {}));
	const e = render(Page);
	expect(e.getByText(/Chargement du thème…/)).toBeInTheDocument();
	expect(e.getByRole('button', { name: 'Commencer la séance' })).toBeDisabled();
});
