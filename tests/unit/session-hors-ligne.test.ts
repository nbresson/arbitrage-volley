// Hors ligne, le profil gardé sur l'appareil permet de rester connecté (règles lisibles sans réseau).
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({
	getUser: vi.fn(),
	getSession: vi.fn(),
	single: vi.fn(),
	signOut: vi.fn(async () => ({}))
}));
vi.mock('#lib/supabase.ts', () => ({
	supabase: {
		auth: { getUser: h.getUser, getSession: h.getSession, signOut: h.signOut },
		from: () => ({ select: () => ({ eq: () => ({ single: h.single }) }) })
	}
}));

import { chargerProfil, seDeconnecter, session } from '../../src/lib/session.svelte';

const profil = { id: 'u1', prenom: 'Camille', nom: 'Essai', role: 'stagiaire', profil_formation: 'arbitre', niveau_id: 'n1', notice_acceptee_le: '2026-10-01', actif: true };

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
	session.profil = null;
});

test('en ligne : le profil est lu puis gardé sur l’appareil', async () => {
	h.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
	h.single.mockResolvedValue({ data: profil, error: null });
	await chargerProfil();
	expect(session.profil).toEqual(profil);
	expect(JSON.parse(localStorage.getItem('profil-hors-ligne')!).id).toBe('u1');
});

test('hors ligne : le profil gardé est repris si la session locale est la même', async () => {
	localStorage.setItem('profil-hors-ligne', JSON.stringify(profil));
	h.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 } });
	h.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
	await chargerProfil();
	expect(session.profil).toEqual(profil);
});

test('hors ligne avec une autre session, ou sans session : pas de profil', async () => {
	localStorage.setItem('profil-hors-ligne', JSON.stringify(profil));
	h.getUser.mockResolvedValue({ data: { user: null }, error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 } });
	h.getSession.mockResolvedValue({ data: { session: { user: { id: 'autre' } } } });
	await chargerProfil();
	expect(session.profil).toBeNull();
});

test('la déconnexion efface le profil gardé', async () => {
	localStorage.setItem('profil-hors-ligne', JSON.stringify(profil));
	await seDeconnecter();
	expect(localStorage.getItem('profil-hors-ligne')).toBeNull();
});
