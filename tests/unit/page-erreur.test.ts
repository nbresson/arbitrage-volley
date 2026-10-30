// Page d'erreur : « Ballon hors terrain » pour une page introuvable, message calme et contact sinon.
import { render } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ status: 404 }));
vi.mock('$app/state', () => ({ page: { get status() { return h.status; }, error: { message: 'x' }, url: new URL('http://x/nimporte') } }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: true, profil: null }, chargerProfil: vi.fn(), seDeconnecter: vi.fn() }));

import PageErreur from '../../src/routes/+error.svelte';

test('404 : ballon hors terrain, avec un lien vers l’accueil', () => {
	h.status = 404;
	const e = render(PageErreur);
	expect(e.getByRole('heading', { name: /Ballon hors terrain/ })).toBeInTheDocument();
	expect(e.getByRole('link', { name: 'Retour à l’accueil' }).getAttribute('href')).toBe('/');
});

test('autre erreur : message calme, réessayer, contact du formateur', () => {
	h.status = 500;
	const e = render(PageErreur);
	expect(e.getByRole('heading', { name: /Le service ne répond pas pour le moment/ })).toBeInTheDocument();
	expect(e.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
	expect(e.getByText(/votre formateur/)).toBeInTheDocument();
});
