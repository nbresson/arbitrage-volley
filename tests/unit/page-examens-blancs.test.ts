// Historique des examens blancs : courbe des scores et tableau daté.
import { fireEvent, render } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ liste: [] as unknown[] }));
vi.mock('$app/state', () => ({ page: { url: new URL('http://x/examens-blancs'), params: {} } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: true, profil: null }, chargerProfil: vi.fn(), seDeconnecter: vi.fn() }));
vi.mock('#lib/data/seances.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/seances')>()), mesExamensBlancs: async () => h.liste }));

import Page from '../../src/routes/examens-blancs/+page.svelte';

beforeEach(() => (h.liste = []));

test('sans examen blanc : état vide avec l’action pour en lancer un', async () => {
	const ecran = render(Page);
	expect(await ecran.findByText('Aucun examen blanc terminé')).toBeInTheDocument();
	expect(ecran.getByRole('link', { name: 'Passer un examen blanc' }).getAttribute('href')).toBe('/entrainement/nouvelle?mode=examen_entrainement');
});

test('une ligne par examen, du plus récent au plus ancien, avec date, score, temps et verdict', async () => {
	h.liste = [
		{ id: 'a', debut: '2026-10-01T10:00:00Z', fin: '2026-10-01T10:40:00Z', duree_minutes: 45, score: 18, total: 30 },
		{ id: 'b', debut: '2026-10-05T10:00:00Z', fin: '2026-10-05T10:31:00Z', duree_minutes: 45, score: 24, total: 30 }
	];
	const ecran = render(Page);
	await ecran.findByRole('table');
	const lignes = ecran.container.querySelectorAll('tbody tr');
	expect(lignes).toHaveLength(2);
	expect(lignes[0].textContent).toContain('24 / 30');
	expect(lignes[0].textContent).toContain('31 min sur 45');
	expect(lignes[0].textContent).toContain('Réussi');
	expect(lignes[1].textContent).toContain('Non réussi');
	expect(lignes[0].querySelector('a')?.getAttribute('href')).toBe('/examen-entrainement/b/resultat');
	expect(ecran.getByRole('img', { name: /Scores des 2 examens blancs : 60 %, 80 %/ })).toBeInTheDocument();
});

test('au toucher, la bulle du point s’affiche', async () => {
	h.liste = [
		{ id: 'a', debut: '2026-10-01T10:00:00Z', fin: '2026-10-01T10:40:00Z', duree_minutes: 45, score: 18, total: 30 },
		{ id: 'b', debut: '2026-10-05T10:00:00Z', fin: '2026-10-05T10:31:00Z', duree_minutes: 45, score: 24, total: 30 }
	];
	const ecran = render(Page);
	await ecran.findByRole('table');
	const cibles = ecran.container.querySelectorAll('rect.cible');
	await fireEvent.pointerDown(cibles[0]);
	expect(ecran.container.querySelector('.bulle')?.textContent).toContain('18 / 30');
});
