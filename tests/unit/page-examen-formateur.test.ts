// Page d'un examen officiel (formateur) : ouverture sans piège, inscriptions fiables.
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({
	examen: {} as Record<string, unknown>,
	enregistrer: vi.fn(),
	ouvrir: vi.fn(),
	desinscrire: vi.fn(),
	resultats: [] as unknown[],
	reserve: [] as unknown[],
	composer: vi.fn()
}));
vi.mock('$app/state', () => ({ page: { params: { id: 'e1' }, url: new URL('http://x/formateur/examens/e1') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), onNavigate: vi.fn(), beforeNavigate: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: true, profil: null }, chargerProfil: vi.fn(), seDeconnecter: vi.fn() }));
vi.mock('#lib/data/seances.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/seances')>()), seanceEnCours: async () => false }));
vi.mock('#lib/data/questions.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/questions')>()), listerQuestions: async () => h.reserve }));
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
	composerExamen: h.composer,
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
	h.composer.mockImplementation(async (_id: string, l: string[]) => l.length);
	h.reserve = ['Libéro au service', 'Libéro en attaque', 'Filet touché', 'Rotation fautive'].map((enonce, i) => ({
		id: `r${i}`, enonce, statut: 'validee', usage: 'reserve_examen', theme: 'Thème', niveau: 'N1', role_cible: 'arbitre', a_relire: false, origine: 'manuelle', theme_id: 't', niveau_id: 'n', reference_origine: null
	}));
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

test('examen ouvert : « En salle » précède les informations, repliées dans la préparation verrouillée', async () => {
	h.examen = { ...h.examen, statut: 'ouvert' };
	h.resultats = [{ stagiaire_id: 's1', prenom: 'Lou', nom: 'Essai', etat: 'en_cours', tentative_id: 't', score: null, total: null, reussi: null, debut: '2026-11-10T09:01:00Z', fin: null, repondues: 1, sorties: 0, nb_questions: 3 }];
	const e = render(Page);
	const salle = await e.findByRole('heading', { name: /En salle/ });
	const infos = e.getByRole('heading', { name: /Informations/ });
	expect(salle.compareDocumentPosition(infos) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	expect(infos.closest('details')?.querySelector('summary')?.textContent).toBe('Préparation de l’examen (verrouillée)');
	const zone = e.getAllByRole('status').find((s) => /commencé/.test(s.textContent ?? ''))!;
	expect(zone.textContent).not.toMatch(/dernière à/);
	expect(e.getByText(/1 stagiaire est encore en cours/)).toBeInTheDocument();
});

test('réserve : recherche dans l’énoncé, ajout des questions affichées en une fois', async () => {
	const e = render(Page);
	await fireEvent.input(await e.findByLabelText('Rechercher dans l’énoncé'), { target: { value: 'libéro' } });
	await fireEvent.click(e.getByRole('button', { name: 'Ajouter les 2 questions affichées' }));
	await waitFor(() => expect(h.composer).toHaveBeenCalledTimes(1));
	expect(h.composer).toHaveBeenCalledWith('e1', ['q1', 'q2', 'q3', 'r0', 'r1']);
});

test('après « Ajouter », le focus va au bouton suivant ; boutons bloqués pendant l’enregistrement', async () => {
	let finir: (n: number) => void = () => {};
	h.composer.mockReturnValue(new Promise((r) => (finir = r)));
	const e = render(Page);
	const boutons = await e.findAllByRole('button', { name: 'Ajouter' });
	await fireEvent.click(boutons[0]);
	expect(e.getAllByRole('button', { name: 'Ajouter' }).every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
	finir(4);
	await waitFor(() => expect(document.activeElement?.textContent).toBe('Ajouter'));
});
