// La page de résultat ne peint jamais une bonne réponse en rouge : le bleu reste « acquis ».
import { render } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';

vi.mock('$app/state', () => ({ page: { url: new URL('http://x/examen-entrainement/s1/resultat'), params: {} } }));

import ResultatExamen from '../../src/lib/components/ResultatExamen.svelte';

const bilan = {
	score: 24,
	total: 30,
	par_theme: [
		{ theme_id: 't1', theme: 'Service', justes: 8, total: 10 },
		{ theme_id: 't2', theme: 'Contre', justes: 10, total: 10 }
	]
};

test('un thème à 8/10 garde ses 8 bonnes réponses en bleu, et sa faiblesse est écrite', () => {
	const { container, getAllByText } = render(ResultatExamen, { bilan, officiel: null, sousTitre: 'Résultat' });
	const lignes = container.querySelectorAll('tbody tr');
	const service = lignes[0];
	expect(service.querySelectorAll('.marques .juste')).toHaveLength(8);
	expect(service.querySelectorAll('.marques .faible')).toHaveLength(0);
	expect(getAllByText('À revoir')).toHaveLength(1);
});

test('le score de l’examen blanc est aussi donné en pourcentage', () => {
	const { getByText } = render(ResultatExamen, { bilan, officiel: null, sousTitre: 'Résultat' });
	expect(getByText('80 % de bonnes réponses')).toBeInTheDocument();
});
