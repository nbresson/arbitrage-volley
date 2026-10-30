// Menu du compte complet, thème rapide, déconnexion protégée pendant une séance.
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ enCours: false, seDeconnecter: vi.fn(async () => {}) }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({
	session: { pret: true, profil: { id: 'u1', prenom: 'Camille', nom: 'Essai', role: 'stagiaire', profil_formation: 'arbitre', niveau_id: 'n1', notice_acceptee_le: '2026-10-01', actif: true } },
	chargerProfil: vi.fn(),
	seDeconnecter: h.seDeconnecter
}));
vi.mock('#lib/data/seances.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/seances')>()), seanceEnCours: async () => h.enCours }));

import Bandeau from '../../src/lib/components/Bandeau.svelte';

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
});
afterEach(() => delete document.documentElement.dataset.theme);

test('le menu propose profil, mot de passe, préférences, aide, puis la déconnexion', () => {
	const ecran = render(Bandeau, { titre: 'Arbitrage volley', sousTitre: 'Accueil' });
	expect(ecran.getByRole('link', { name: 'Mon profil' }).getAttribute('href')).toBe('/profil');
	expect(ecran.getByRole('link', { name: 'Changer mon mot de passe' }).getAttribute('href')).toBe('/mot-de-passe');
	expect(ecran.getByRole('link', { name: 'Préférences' }).getAttribute('href')).toBe('/preferences');
	expect(ecran.getByRole('link', { name: 'Aide' }).getAttribute('href')).toBe('/aide');
	expect(ecran.getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
});

test('thème choisi depuis le menu : appliqué et mémorisé', async () => {
	const ecran = render(Bandeau, { titre: 'Arbitrage volley', sousTitre: 'Accueil' });
	await fireEvent.click(ecran.getByRole('radio', { name: 'Sombre' }));
	expect(document.documentElement.dataset.theme).toBe('sombre');
	expect(JSON.parse(localStorage.getItem('preferences')!).theme).toBe('sombre');
});

test('séance en cours : confirmation avant de se déconnecter', async () => {
	h.enCours = true;
	const ecran = render(Bandeau, { titre: 'Arbitrage volley', sousTitre: 'Accueil' });
	await fireEvent.click(ecran.getByRole('button', { name: 'Se déconnecter' }));
	expect(await ecran.findByText('Votre séance reste enregistrée. Se déconnecter ?')).toBeInTheDocument();
	expect(h.seDeconnecter).not.toHaveBeenCalled();
	await fireEvent.click(ecran.getByRole('button', { name: 'Se déconnecter quand même', hidden: true }));
	await waitFor(() => expect(h.seDeconnecter).toHaveBeenCalled());
});

test('sans séance en cours : déconnexion directe', async () => {
	h.enCours = false;
	const ecran = render(Bandeau, { titre: 'Arbitrage volley', sousTitre: 'Accueil' });
	await fireEvent.click(ecran.getByRole('button', { name: 'Se déconnecter' }));
	await waitFor(() => expect(h.seDeconnecter).toHaveBeenCalled());
});
