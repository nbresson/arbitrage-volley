// La page de résultat ne peint jamais une bonne réponse en rouge : le bleu reste « acquis ».
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ goto: vi.fn(), rejouer: vi.fn(async (_s: string, avec: boolean) => (avec ? 'peda-1' : 'exam-2')) }));
vi.mock('$app/state', () => ({ page: { url: new URL('http://x/examen-entrainement/s1/resultat'), params: {} } }));
vi.mock('$app/navigation', () => ({ goto: h.goto }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/data/seances.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/seances')>()), rejouerExamen: h.rejouer }));

import ResultatExamen from '../../src/lib/components/ResultatExamen.svelte';

const bilan = {
	score: 24,
	total: 30,
	par_theme: [
		{ theme_id: 't1', theme: 'Service', justes: 8, total: 10 },
		{ theme_id: 't2', theme: 'Contre', justes: 10, total: 10 }
	]
};

test('un thème à 8/10 garde ses 8 bonnes réponses en bleu, et ses erreurs sont écrites sans alarme', () => {
	const { container, getAllByText } = render(ResultatExamen, { bilan, officiel: null, sousTitre: 'Résultat' });
	const lignes = container.querySelectorAll('tbody tr');
	const service = lignes[0];
	expect(service.querySelectorAll('.marques .juste')).toHaveLength(8);
	expect(service.querySelectorAll('.marques .faible')).toHaveLength(0);
	expect(getAllByText('2 erreurs')).toHaveLength(1);
});

test('le score de l’examen blanc est aussi donné en pourcentage', () => {
	const { getByText } = render(ResultatExamen, { bilan, officiel: null, sousTitre: 'Résultat' });
	expect(getByText('80 % de bonnes réponses')).toBeInTheDocument();
});

const blanc = { seanceId: 's1', temps: '31 min sur 45', comparaison: '+3 points par rapport à votre dernier examen blanc.', date: '2026-10-18T10:31:00Z' };

test('examen blanc : verdict en toutes lettres, temps utilisé, comparaison', () => {
	const { getByText } = render(ResultatExamen, { bilan, officiel: null, sousTitre: 'Résultat', blanc });
	expect(getByText('Au seuil provisoire de 70 % (21 / 30), cet examen serait réussi.')).toBeInTheDocument();
	expect(getByText('Temps utilisé : 31 min sur 45')).toBeInTheDocument();
	expect(getByText('+3 points par rapport à votre dernier examen blanc.')).toBeInTheDocument();
});

test('examen officiel : pas de verdict « vous auriez réussi »', () => {
	const { queryByText } = render(ResultatExamen, { bilan, officiel: { seuil: 20, reussi: true }, sousTitre: 'Résultat' });
	expect(queryByText(/seuil provisoire/)).toBeNull();
});

test('revoir l’examen avec la correction, ou le refaire dans un nouvel ordre', async () => {
	const { getByRole } = render(ResultatExamen, { bilan, officiel: null, sousTitre: 'Résultat', blanc });
	await fireEvent.click(getByRole('button', { name: 'Revoir l’examen avec la correction' }));
	await waitFor(() => expect(h.goto).toHaveBeenCalledWith('/entrainement/peda-1'));
	expect(h.rejouer).toHaveBeenCalledWith('s1', true);
	await fireEvent.click(getByRole('button', { name: 'Refaire le même examen' }));
	await waitFor(() => expect(h.goto).toHaveBeenCalledWith('/examen-entrainement/exam-2'));
	expect(h.rejouer).toHaveBeenCalledWith('s1', false);
});

test('export : impression ou enregistrement en PDF, et lien vers l’historique', async () => {
	const imprimer = vi.spyOn(window, 'print').mockImplementation(() => {});
	const { getByRole } = render(ResultatExamen, { bilan, officiel: null, sousTitre: 'Résultat', blanc });
	await fireEvent.click(getByRole('button', { name: 'Imprimer ou enregistrer en PDF' }));
	expect(imprimer).toHaveBeenCalled();
	expect(getByRole('link', { name: 'Historique de mes examens blancs' }).getAttribute('href')).toBe('/examens-blancs');
});
