import { render } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Courbe from '../../src/lib/components/Courbe.svelte';

test('la courbe décrit ses valeurs en toutes lettres et place un point par séance', () => {
	const { getByRole, container } = render(Courbe, { valeurs: [40, 60, 80] });
	expect(getByRole('img', { name: 'Réussite des 3 dernières séances : 40 %, 60 %, 80 %' })).toBeInTheDocument();
	expect(container.querySelectorAll('circle')).toHaveLength(3);
});

test('sans séance : un tiret', () => {
	const { getByText, container } = render(Courbe, { valeurs: [] });
	expect(getByText('Aucune séance')).toBeInTheDocument();
	expect(container.querySelector('svg')).toBeNull();
});
