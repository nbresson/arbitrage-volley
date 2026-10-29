import { render } from '@testing-library/svelte';
import { afterEach, expect, test } from 'vitest';
import Bandeau from '../../src/lib/components/Bandeau.svelte';
import { session } from '../../src/lib/session.svelte.ts';

afterEach(() => {
	session.profil = null;
});

test('connecté : un rond aux initiales ouvre le menu du compte', () => {
	session.profil = {
		id: 'u1',
		prenom: 'Nicolas',
		nom: 'Bresson',
		role: 'formateur',
		profil_formation: 'arbitre',
		niveau_id: 'n1',
		notice_acceptee_le: '2026-10-01T10:00:00Z',
		actif: true
	};
	const { getByText, getByRole } = render(Bandeau, { titre: 'Arbitrage volley', sousTitre: 'Accueil' });
	expect(getByText('NB')).toBeInTheDocument();
	expect(getByText('Nicolas Bresson')).toBeInTheDocument();
	expect(getByRole('button', { name: 'Se déconnecter' })).toBeInTheDocument();
});

test('non connecté : pas de menu du compte', () => {
	const { queryByText } = render(Bandeau, { titre: 'Arbitrage volley', sousTitre: 'Connexion' });
	expect(queryByText('Se déconnecter')).toBeNull();
});
