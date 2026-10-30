// Connexion et mot de passe : bouton utilisable avec l'autoremplissage, validation à l'envoi, succès confirmé.
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({
	signIn: vi.fn(async () => ({ error: null })),
	getSession: vi.fn(),
	updateUser: vi.fn(async () => ({ error: null })),
	reset: vi.fn(async () => ({ error: null }))
}));
vi.mock('$app/state', () => ({ page: { params: {}, url: new URL('http://x/') } }));
vi.mock('#lib/supabase.ts', () => ({
	supabase: { auth: { signInWithPassword: h.signIn, getSession: h.getSession, updateUser: h.updateUser, resetPasswordForEmail: h.reset } }
}));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: true, profil: null }, chargerProfil: vi.fn(), seDeconnecter: vi.fn() }));

import Connexion from '../../src/routes/connexion/+page.svelte';
import MotDePasse from '../../src/routes/mot-de-passe/+page.svelte';

beforeEach(() => vi.clearAllMocks());

test('le bouton Se connecter n’est désactivé que pendant l’envoi', () => {
	const e = render(Connexion);
	expect(e.getByRole('button', { name: 'Se connecter' })).toBeEnabled();
});

test('champs vides à l’envoi : message relié aux champs, aucun appel', async () => {
	const e = render(Connexion);
	await fireEvent.click(e.getByRole('button', { name: 'Se connecter' }));
	const alerte = await e.findByRole('alert');
	expect(alerte).toHaveTextContent('Indiquez votre adresse e-mail et votre mot de passe.');
	expect(e.getByLabelText('Adresse e-mail').getAttribute('aria-describedby')).toBe(alerte.id);
	expect(h.signIn).not.toHaveBeenCalled();
});

test('mot de passe : aucun formulaire tant que la session n’est pas lue', async () => {
	h.getSession.mockReturnValue(new Promise(() => {}));
	const e = render(MotDePasse);
	expect(e.queryByRole('heading', { name: 'Mot de passe oublié' })).toBeNull();
	expect(e.queryByRole('heading', { name: 'Choisir votre mot de passe' })).toBeNull();
});

test('après enregistrement : « Mot de passe enregistré. » annoncé, et un lien Annuler en mode choix', async () => {
	h.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
	const e = render(MotDePasse);
	expect(await e.findByRole('link', { name: 'Annuler' })).toHaveAttribute('href', '/profil');
	await fireEvent.input(e.getByLabelText(/Nouveau mot de passe/), { target: { value: 'unmotdepasse-long' } });
	await fireEvent.input(e.getByLabelText('Confirmer le mot de passe'), { target: { value: 'unmotdepasse-long' } });
	await fireEvent.click(e.getByRole('button', { name: 'Enregistrer le mot de passe' }));
	await waitFor(() => expect(e.getByRole('status')).toHaveTextContent('Mot de passe enregistré.'));
});

test('« Recevoir un lien » utilisable sans saisie, avec un message si l’adresse manque', async () => {
	h.getSession.mockResolvedValue({ data: { session: null } });
	const e = render(MotDePasse);
	const bouton = await e.findByRole('button', { name: 'Recevoir un lien' });
	expect(bouton).toBeEnabled();
	await fireEvent.click(bouton);
	expect(await e.findByRole('alert')).toHaveTextContent('Indiquez votre adresse e-mail.');
	expect(h.reset).not.toHaveBeenCalled();
});
