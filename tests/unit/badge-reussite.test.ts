import { render } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import BadgeReussite from '../../src/lib/components/BadgeReussite.svelte';

test('réussi : le mot est écrit, l’icône est décorative', () => {
	const { container, getByText } = render(BadgeReussite, { reussi: true });
	expect(getByText('Réussi')).toBeInTheDocument();
	expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
});

test('non réussi : le mot est écrit', () => {
	const { getByText, queryByText } = render(BadgeReussite, { reussi: false });
	expect(getByText('Non réussi')).toBeInTheDocument();
	expect(queryByText('Réussi')).toBeNull();
});
