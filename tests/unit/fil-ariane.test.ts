import { render } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import FilAriane from '../../src/lib/components/FilAriane.svelte';

test('les étapes sont des liens, la page courante est marquée et n’est pas un lien', () => {
	const { getByRole, getByText } = render(FilAriane, {
		etapes: [{ libelle: 'Examens officiels', href: '/formateur/examens' }, { libelle: 'Examen du 12 nov.' }]
	});
	expect(getByRole('navigation', { name: 'Fil d’Ariane' })).toBeInTheDocument();
	expect(getByRole('link', { name: 'Examens officiels' }).getAttribute('href')).toBe('/formateur/examens');
	const courante = getByText('Examen du 12 nov.');
	expect(courante.tagName).not.toBe('A');
	expect(courante.getAttribute('aria-current')).toBe('page');
});
