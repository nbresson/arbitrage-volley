import { render } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Chargement from '../../src/lib/components/Chargement.svelte';

test('annonce le chargement aux lecteurs d’écran et dessine des formes grises', () => {
	const { getByRole, container } = render(Chargement, { lignes: 4 });
	expect(getByRole('status')).toHaveTextContent('Chargement…');
	expect(container.querySelectorAll('.forme')).toHaveLength(4);
});
