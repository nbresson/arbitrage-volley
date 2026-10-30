// Fiche stagiaire : inscriptions réelles, détail cohérent, erreurs lisibles.
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({
	actif: true,
	detail: vi.fn(),
	inscrire: vi.fn(),
	promotion: vi.fn(),
	inscriptions: [] as unknown[]
}));
vi.mock('$app/state', () => ({ page: { params: { id: 's1' }, url: new URL('http://x/formateur/stagiaires/s1') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), onNavigate: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: true, profil: null }, chargerProfil: vi.fn(), seDeconnecter: vi.fn() }));
vi.mock('#lib/data/seances.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/seances')>()),
	referentiel: async () => ({ themes: [], niveaux: [{ id: 'n1', libelle: 'Niveau 1' }] }),
	avancement: async () => [],
	seanceEnCours: async () => false
}));
vi.mock('#lib/data/stagiaires.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/stagiaires')>()),
	listerComptes: async () => [{ id: 's1', prenom: 'Lou', nom: 'Essai', email: 'lou@x.fr', role: 'stagiaire', profil_formation: 'arbitre', niveau_id: 'n1', actif: h.actif, promotion: null }],
	activiteStagiaires: async () => new Map(),
	changerPromotion: h.promotion
}));
vi.mock('#lib/data/examens-formateur.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/examens-formateur')>()),
	examensDuStagiaire: async () => [
		{ tentative_id: 't1', titre: 'Examen A', date_heure: '2026-10-01T09:00:00Z', score: 20, total: 30, reussi: false },
		{ tentative_id: 't2', titre: 'Examen B', date_heure: '2026-09-01T09:00:00Z', score: 25, total: 30, reussi: true }
	],
	detailTentative: h.detail,
	listerExamens: async () => [
		{ id: 'e1', titre: 'Examen de novembre', date_heure: '2026-11-10T09:00:00Z', lieu: '', statut: 'brouillon', inscrits: 3 },
		{ id: 'e2', titre: 'Examen de décembre', date_heure: '2026-12-10T09:00:00Z', lieu: '', statut: 'brouillon', inscrits: 1 }
	],
	inscrire: h.inscrire,
	inscriptionsDuStagiaire: async () => h.inscriptions
}));

import Page from '../../src/routes/formateur/stagiaires/[id]/+page.svelte';

const detail = (titre: string) => ({ examen_id: 'e', titre, date_heure: '2026-10-01T09:00:00Z', score: 20, total: 30, seuil: 21, reussi: false, questions: [], regles: [] });

beforeEach(() => {
	vi.clearAllMocks();
	h.actif = true;
	h.inscriptions = [{ examen_id: 'e1', titre: 'Examen de novembre', date_heure: '2026-11-10T09:00:00Z', statut: 'brouillon' }];
	h.detail.mockImplementation(async (t: string) => detail(t === 't1' ? 'Examen A' : 'Examen B'));
	h.inscrire.mockResolvedValue(undefined);
	h.promotion.mockResolvedValue(undefined);
});

test('« Inscrit à : … » dans le résumé, et les examens déjà choisis sont marqués et désactivés', async () => {
	const e = render(Page);
	expect(await e.findByText(/Inscrit à : Examen de novembre/)).toBeInTheDocument();
	await fireEvent.click(e.getByRole('button', { name: 'Inscrire à un examen officiel' }));
	const deja = await e.findByRole('option', { name: /Examen de novembre.*\(déjà inscrit\)/ });
	expect(deja).toBeDisabled();
	expect(e.getByRole('option', { name: /Examen de décembre/ })).toBeEnabled();
});

test('compte désactivé : pas de bouton d’inscription', async () => {
	h.actif = false;
	const e = render(Page);
	expect(await e.findByText('Compte désactivé : réactivez-le depuis la liste.')).toBeInTheDocument();
	expect(e.queryByRole('button', { name: 'Inscrire à un examen officiel' })).toBeNull();
});

test('changer d’examen vide le détail et ignore une réponse tardive', async () => {
	let resoudreA: (v: unknown) => void = () => {};
	const e = render(Page);
	expect(await e.findByRole('heading', { name: 'Examen A' })).toBeInTheDocument();
	h.detail.mockImplementation((t: string) => (t === 't1' ? new Promise((r) => (resoudreA = r)) : Promise.resolve(detail('Examen B'))));
	await fireEvent.click(e.getByRole('button', { name: 'Examen A' }));
	expect(e.queryByRole('heading', { name: 'Examen A' })).toBeNull();
	await fireEvent.click(e.getByRole('button', { name: 'Examen B' }));
	expect(await e.findByRole('heading', { name: 'Examen B' })).toBeInTheDocument();
	resoudreA(detail('Examen A'));
	await new Promise((r) => setTimeout(r, 20));
	expect(e.getByRole('heading', { name: 'Examen B' })).toBeInTheDocument();
});

test('erreur de promotion : une alerte, distincte du succès ; bouton « Enregistrement… » pendant l’envoi', async () => {
	let echouer: (e: unknown) => void = () => {};
	h.promotion.mockReturnValue(new Promise((_, rej) => (echouer = rej)));
	const e = render(Page);
	await e.findByLabelText('Promotion');
	await fireEvent.input(e.getByLabelText('Promotion'), { target: { value: 'Automne' } });
	await fireEvent.click(e.getByRole('button', { name: 'Enregistrer' }));
	expect(e.getByRole('button', { name: 'Enregistrement…' })).toBeDisabled();
	echouer(new Error('x'));
	expect(await e.findByRole('alert')).toHaveTextContent('La promotion n’a pas pu être enregistrée.');
});

test('erreur d’inscription : phrase française, message du serveur dans le détail', async () => {
	h.inscriptions = [];
	h.inscrire.mockRejectedValue(new Error('duplicate key value violates unique constraint'));
	const e = render(Page);
	await fireEvent.click(await e.findByRole('button', { name: 'Inscrire à un examen officiel' }));
	await fireEvent.click(await e.findByRole('button', { name: 'Inscrire' }));
	expect(await e.findByText(/L’inscription n’a pas pu être enregistrée\./)).toBeInTheDocument();
	expect(e.getByText('duplicate key value violates unique constraint').closest('details')).not.toBeNull();
});
