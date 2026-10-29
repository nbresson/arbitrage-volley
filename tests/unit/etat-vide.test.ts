import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { expect, test } from 'vitest';
import EtatVide from '../../src/lib/components/EtatVide.svelte';

test('un titre, un texte, une illustration décorative et une action', () => {
	const action = createRawSnippet(() => ({ render: () => '<a href="/x">Créer le premier</a>' }));
	const { getByRole, getByText, container } = render(EtatVide, { titre: 'Aucun examen pour l’instant', texte: 'Créez le premier.', action });
	expect(getByRole('heading', { name: 'Aucun examen pour l’instant' })).toBeInTheDocument();
	expect(getByText('Créez le premier.')).toBeInTheDocument();
	expect(getByRole('link', { name: 'Créer le premier' })).toBeInTheDocument();
	expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
});
