import { render } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import Reponse from '../../src/lib/components/Reponse.svelte';

const base = { nom: 'reponse', valeur: 'p1', lettre: 'A', texte: 'Jeu continue', choisie: false, desactivee: false, onchoisir: () => {} };

describe('Reponse', () => {
	test('un vrai bouton radio relié à son libellé', () => {
		const { getByRole } = render(Reponse, { ...base, etat: 'neutre' });
		const radio = getByRole('radio', { name: /Jeu continue/ });
		expect(radio).toHaveAttribute('name', 'reponse');
		expect(radio).not.toBeChecked();
	});

	test('état juste : libellé « Bonne réponse »', () => {
		const { getByText } = render(Reponse, { ...base, etat: 'ok' });
		expect(getByText('Bonne réponse')).toBeInTheDocument();
	});

	test('état faux : libellé « Votre réponse »', () => {
		const { getByText } = render(Reponse, { ...base, etat: 'ko', choisie: true });
		expect(getByText('Votre réponse')).toBeInTheDocument();
	});

	test('juste et choisie : « Bonne réponse, la vôtre »', () => {
		const { getByText } = render(Reponse, { ...base, etat: 'ok', choisie: true });
		expect(getByText('Bonne réponse, la vôtre')).toBeInTheDocument();
	});

	test('désactivée après correction', () => {
		const { getByRole } = render(Reponse, { ...base, etat: 'ecartee', desactivee: true });
		expect(getByRole('radio')).toBeDisabled();
	});
});
