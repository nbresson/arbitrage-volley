// Page d'un examen officiel (formateur) : ouverture sans piège, inscriptions fiables.
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({
	examen: {} as Record<string, unknown>,
	enregistrer: vi.fn(),
	ouvrir: vi.fn(),
	desinscrire: vi.fn(),
	resultats: [] as unknown[]
}));
vi.mock('$app/state', () => ({ page: { params: { id: 'e1' }, url: new URL('http://x/formateur/examens/e1') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), onNavigate: vi.fn(), beforeNavigate: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: true, profil: null }, chargerProfil: vi.fn(), seDeconnecter: vi.fn() }));
vi.mock('#lib/data/seances.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/seances')>()), seanceEnCours: async () => false }));
vi.mock('#lib/data/questions.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/questions')>()), listerQuestions: async () => [] }));
vi.mock('#lib/data/stagiaires.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/stagiaires')>()),
	listerComptes: async () => [{ id: 's1', prenom: 'Lou', nom: 'Essai', email: 'l@x.fr', role: 'stagiaire', profil_formation: 'arbitre', niveau_id: 'n1', actif: true, promotion: null }]
}));
vi.mock('#lib/data/mesures.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/mesures')>()), avisDeLExamen: async () => [] }));
vi.mock('#lib/data/examens-formateur.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/examens-formateur')>()),
	lireExamen: async () => structuredClone(h.examen),
	enregistrerExamen: h.enregistrer,
	ouvrirExamen: h.ouvrir,
	desinscrire: h.desinscrire,
	codeExamen: async () => '123456',
	resultatsExamen: async () => h.resultats,
	statsExamen: async () => []
}));

import Page from '../../src/routes/formateur/examens/[id]/+page.svelte';

beforeEach(() => {
	vi.clearAllMocks();
	h.examen = {
		id: 'e1', titre: 'Examen', date_heure: '2026-11-10T09:00:00Z', lieu: 'Salle 2', duree_minutes: 45, seuil_reussite: 2, statut: 'brouillon',
		questions: [1, 2, 3].map((n) => ({ question_id: `q${n}`, ordre: n, enonce: `Q${n}`, theme: null })),
		inscrits: ['s1']
	};
	h.resultats = [];
	h.enregistrer.mockResolvedValue('e1');
	h.ouvrir.mockResolvedValue('123456');
});

test('ouvrir avec un seuil modifié enregistre d’abord', async () => {
	const e = render(Page);
	const seuil = await e.findByLabelText(/Seuil de réussite/);
	await fireEvent.input(seuil, { target: { value: '3' } });
	expect(e.getByText('Vos modifications des informations seront enregistrées à l’ouverture.')).toBeInTheDocument();
	await fireEvent.click(e.getByRole('button', { name: 'Ouvrir l’examen' }));
	await fireEvent.click(e.getAllByRole('button', { name: 'Ouvrir l’examen', hidden: true }).at(-1)!);
	await waitFor(() => expect(h.ouvrir).toHaveBeenCalled());
	expect(h.enregistrer).toHaveBeenCalledWith(expect.objectContaining({ seuil: 3 }), 'e1');
	expect(h.enregistrer.mock.invocationCallOrder[0]).toBeLessThan(h.ouvrir.mock.invocationCallOrder[0]);
});

test('la liste de contrôle lit le seuil du formulaire', async () => {
	const e = render(Page);
	const seuil = await e.findByLabelText(/Seuil de réussite/);
	await fireEvent.input(seuil, { target: { value: '9' } });
	expect(e.getByRole('button', { name: 'Ouvrir l’examen' })).toBeDisabled();
});

test('seuil affiché sur le nombre de questions', async () => {
	const e = render(Page);
	await e.findByLabelText(/Seuil de réussite/);
	expect(e.getByText('/ 3')).toBeInTheDocument();
});

test('désinscription refusée : la case revient cochée, l’erreur nomme le stagiaire', async () => {
	let refuser: (e: unknown) => void = () => {};
	h.desinscrire.mockReturnValue(new Promise((_, rej) => (refuser = rej)));
	const e = render(Page);
	const caseLou = (await e.findByLabelText(/Lou Essai/)) as HTMLInputElement;
	await fireEvent.click(caseLou);
	expect(caseLou).toBeDisabled();
	refuser(new Error('Ce stagiaire a déjà commencé l’examen : il ne peut plus être désinscrit.'));
	expect(await e.findByText('Lou Essai : Ce stagiaire a déjà commencé l’examen : il ne peut plus être désinscrit.')).toBeInTheDocument();
	expect(caseLou.checked).toBe(true);
	expect(caseLou).toBeEnabled();
});
