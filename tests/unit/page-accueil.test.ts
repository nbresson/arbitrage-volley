// Accueil : examen du jour en tête, erreur honnête et réessayable, bienvenue sous le titre.
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({
	avancement: vi.fn(),
	seanceARevoir: vi.fn(async () => 's-revoir'),
	convocations: [] as unknown[]
}));
vi.mock('$app/state', () => ({ page: { params: {}, url: new URL('http://x/') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), onNavigate: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({
	session: { pret: true, profil: { id: 'u1', prenom: 'Camille', nom: 'Essai', role: 'stagiaire', profil_formation: 'arbitre', niveau_id: 'n1', notice_acceptee_le: '2026-10-01', actif: true } },
	chargerProfil: vi.fn(),
	seDeconnecter: vi.fn()
}));
vi.mock('#lib/data/seances.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/seances')>()),
	avancement: h.avancement,
	seanceAReprendre: async () => null,
	mesSeancesRecentes: async () => [],
	referentiel: async () => ({ themes: [], niveaux: [] }),
	seanceEnCours: async () => false
}));
vi.mock('#lib/data/questions.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/questions')>()), nouveautesDepuis: async () => ({ nb: 0, themes: [] }) }));
vi.mock('#lib/data/marquees.ts', () => ({ mesMarquees: async () => new Set(), seanceMarquees: vi.fn(), marquer: vi.fn(), seanceARevoir: h.seanceARevoir }));
vi.mock('#lib/data/examens-officiels.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/examens-officiels')>()), mesConvocations: async () => h.convocations }));

import Accueil from '../../src/routes/+page.svelte';

const ligne = (acquises = 0, a_revoir = 0) => ({ theme_id: 't1', theme: 'Service', ordre: 1, total: 10, acquises, a_revoir });
const convocation = (statut: string) => ({ examen_id: 'e1', titre: 'Examen de fin de module', date_heure: '2026-11-01T09:00:00Z', lieu: 'Salle 2', duree_minutes: 45, nb_questions: 30, formateur: null, statut, tentative_id: null, terminee: false });

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
	h.convocations = [];
	h.avancement.mockResolvedValue([ligne(3, 1)]);
});

test('examen ouvert : la convocation précède les tuiles, la tuile d’entraînement n’est plus mise en avant', async () => {
	h.convocations = [convocation('ouvert')];
	const e = render(Accueil);
	await e.findByRole('link', { name: 'Commencer l’examen' });
	const conv = e.container.querySelector('.convocation')!;
	const tuiles = e.container.querySelector('.tuiles')!;
	expect(conv.compareDocumentPosition(tuiles) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	expect(e.getByRole('link', { name: /Séance d’entraînement/ }).classList.contains('sombre')).toBe(false);
});

test('examen à venir sur grand écran : la convocation reste dans la colonne de droite', async () => {
	h.convocations = [convocation('brouillon')];
	const e = render(Accueil);
	await e.findByText('Examen de fin de module');
	expect(e.container.querySelector('.cote .convocation')).not.toBeNull();
	expect(e.getByRole('link', { name: /Séance d’entraînement/ }).classList.contains('sombre')).toBe(true);
});

test('erreur de chargement : ni volets « 000 » ni tableau, Réessayer relance le chargement', async () => {
	const reload = vi.fn();
	Object.defineProperty(window, 'location', { value: { ...window.location, reload }, configurable: true });
	h.avancement.mockRejectedValueOnce(new Error('réseau'));
	const e = render(Accueil);
	await e.findByRole('button', { name: 'Réessayer' });
	expect(e.container.querySelector('table')).toBeNull();
	expect(e.container.querySelector('.bandeau .compteurs')).toBeNull();
	await fireEvent.click(e.getByRole('button', { name: 'Réessayer' }));
	await waitFor(() => expect(h.avancement).toHaveBeenCalledTimes(2));
	expect(reload).not.toHaveBeenCalled();
	expect(await e.findByRole('table')).toBeInTheDocument();
});

test('nouveau stagiaire : bienvenue juste sous le titre, sans objectif de la semaine', async () => {
	h.avancement.mockResolvedValue([ligne(0, 0)]);
	const e = render(Accueil);
	const bienvenue = await e.findByRole('region', { name: 'Pour commencer' });
	const tuiles = e.container.querySelector('.tuiles')!;
	expect(bienvenue.compareDocumentPosition(tuiles) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	expect(e.container.querySelector('.semaine')).toBeNull();
});

test('« Revoir mes questions à revoir » seulement s’il y en a, et il lance la séance', async () => {
	const assign = vi.fn();
	Object.defineProperty(window, 'location', { value: { ...window.location, assign }, configurable: true });
	const e = render(Accueil);
	const bouton = await e.findByRole('button', { name: 'Revoir ma question à revoir' });
	await fireEvent.click(bouton);
	await waitFor(() => expect(assign).toHaveBeenCalledWith('/entrainement/s-revoir'));
	e.unmount();
	h.avancement.mockResolvedValue([ligne(3, 0)]);
	const f = render(Accueil);
	await f.findByRole('table');
	expect(f.queryByRole('button', { name: /à revoir/ })).toBeNull();
});
