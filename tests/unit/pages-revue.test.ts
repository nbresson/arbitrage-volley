// Tests de pages pour les corrections de la revue finale (accès à la base simulé).
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({
	params: {} as Record<string, string>,
	goto: vi.fn(),
	enregistrerQuestion: vi.fn(),
	chargerQuestion: vi.fn(),
	terminerSeance: vi.fn(),
	infoSeance: vi.fn(),
	rappelAuth: null as null | ((evt: string) => unknown),
	chargerProfil: vi.fn()
}));

vi.mock('$app/state', () => ({ page: { get params() { return h.params; }, url: new URL('http://x/') } }));
vi.mock('$app/navigation', () => ({ goto: h.goto, onNavigate: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({
	supabase: {
		auth: {
			onAuthStateChange: (cb: (evt: string) => unknown) => {
				h.rappelAuth = cb;
				return { data: { subscription: { unsubscribe() {} } } };
			}
		}
	}
}));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: false, profil: null }, chargerProfil: h.chargerProfil, seDeconnecter: vi.fn() }));
vi.mock('#lib/data/questions.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/questions')>()),
	enregistrerQuestion: h.enregistrerQuestion,
	chargerQuestion: h.chargerQuestion,
	archiverQuestion: vi.fn()
}));
vi.mock('#lib/data/regles.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/regles')>()), toutesLesRegles: async () => [{ id: 'r1', edition: 'Règles', source: 'fivb_regles', reference: '19.3.1.4', parent_reference: null, titre: null, texte: 'Texte', texte_original: null, renvois: [], video_url: null }] }));
vi.mock('#lib/data/seances.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/seances')>()),
	referentiel: async () => ({ themes: [{ id: 't1', libelle: 'Le Libéro' }], niveaux: [{ id: 'n1', libelle: 'Niveau 1' }] }),
	terminerSeance: h.terminerSeance,
	infoSeance: h.infoSeance
}));

import EditionQuestion from '../../src/routes/formateur/questions/[id]/+page.svelte';
import Resultat from '../../src/routes/examen-entrainement/[seance]/resultat/+page.svelte';
import Layout from '../../src/routes/+layout.svelte';

beforeEach(() => vi.clearAllMocks());

const questionChargee = (id: string) => ({
	id,
	statut: 'brouillon',
	a_relire: false,
	reglesLiees: [{ id: 'r1', reference: '19.3.1.4', edition: 'Règles', principale: true }],
	origine: null,
	formulaire: {
		enonce: 'Énoncé',
		propositions: (['A', 'B', 'C', 'D'] as const).map((lettre) => ({ lettre, texte: `P${lettre}` })),
		bonne: 'B',
		explication: 'Parce que',
		themeId: 't1',
		niveauId: 'n1',
		roleCible: 'arbitre',
		usage: 'entrainement',
		videoUrl: '',
		regles: [{ id: 'r1', principale: true }]
	}
});

describe('édition d’une question', () => {
	test('nouvelle question : le deuxième enregistrement modifie la question créée, sans doublon', async () => {
		h.params = { id: 'nouvelle' };
		h.enregistrerQuestion.mockResolvedValue('q-77');
		h.chargerQuestion.mockResolvedValue({ ...questionChargee('q-77'), statut: 'validee' });
		const e = render(EditionQuestion);
		await fireEvent.input(await e.findByLabelText('Énoncé'), { target: { value: 'Énoncé' } });
		for (const l of ['A', 'B', 'C', 'D']) await fireEvent.input(e.getByLabelText(`Proposition ${l}`), { target: { value: `P${l}` } });
		await fireEvent.click(e.getByLabelText(/Bonne réponse :\s*B/));
		await fireEvent.input(e.getByLabelText(/^Explication/), { target: { value: 'Parce que la règle 19.3.1.4 le prévoit expressément.' } });
		await fireEvent.change(e.getByLabelText('Thème'), { target: { value: 't1' } });
		await fireEvent.change(e.getByLabelText('Niveau'), { target: { value: 'n1' } });
		await fireEvent.input(e.getByLabelText('Ajouter une règle'), { target: { value: '19.3' } });
		await fireEvent.click(await e.findByRole('button', { name: /19.3.1.4/ }));
		await fireEvent.click(e.getByRole('button', { name: 'Valider la question' }));
		await waitFor(() => expect(h.enregistrerQuestion).toHaveBeenCalledTimes(1));
		await fireEvent.click(await e.findByRole('button', { name: 'Enregistrer et garder validée' }));
		await waitFor(() => expect(h.enregistrerQuestion).toHaveBeenCalledTimes(2));
		expect(h.enregistrerQuestion.mock.calls.map((c) => c[0])).toEqual([null, 'q-77']);
	});

	test('appuyer sur Entrée dans un champ n’enregistre rien (et ne repasse pas en brouillon)', async () => {
		h.params = { id: 'q-42' };
		h.chargerQuestion.mockResolvedValue({ ...questionChargee('q-42'), statut: 'validee' });
		const e = render(EditionQuestion);
		const video = await e.findByLabelText(/Vidéo/);
		await fireEvent.submit(video.closest('form')!);
		expect(h.enregistrerQuestion).not.toHaveBeenCalled();
	});
});

describe('page de résultat d’examen', () => {
	test('un examen non terminé n’est pas clos par la page : retour à l’examen', async () => {
		h.params = { seance: 's1' };
		h.infoSeance.mockResolvedValue({ id: 's1', type: 'examen_entrainement', debut: new Date().toISOString(), fin: null, duree_minutes: 30, nb_questions: 5 });
		render(Resultat);
		await waitFor(() => expect(h.goto).toHaveBeenCalledWith('/examen-entrainement/s1', { replaceState: true }));
		expect(h.terminerSeance).not.toHaveBeenCalled();
	});

	test('un examen terminé affiche son bilan', async () => {
		h.params = { seance: 's1' };
		h.infoSeance.mockResolvedValue({ id: 's1', type: 'examen_entrainement', debut: '', fin: new Date().toISOString(), duree_minutes: 30, nb_questions: 5 });
		h.terminerSeance.mockResolvedValue({ score: 4, total: 5, par_theme: [] });
		const ecran = render(Resultat);
		expect(await ecran.findByRole('img', { name: 'Score : 4 sur 5' })).toBeInTheDocument();
	});
});

describe('layout', () => {
	test('le rappel d’authentification ne renvoie pas de promesse (évite le blocage de supabase-js)', async () => {
		h.chargerProfil.mockResolvedValue(null);
		render(Layout, { props: { children: (() => {}) as never } });
		await waitFor(() => expect(h.rappelAuth).not.toBeNull());
		expect(h.rappelAuth!('SIGNED_IN')).toBeUndefined();
	});
});

describe('éditeur : vérificateur de qualité', () => {
	test('une explication trop courte est signalée ; « Valider quand même » enregistre', async () => {
		h.params = { id: 'nouvelle' };
		h.enregistrerQuestion.mockResolvedValue('q-78');
		h.chargerQuestion.mockResolvedValue({ ...questionChargee('q-78'), statut: 'validee' });
		const e = render(EditionQuestion);
		await fireEvent.input(await e.findByLabelText('Énoncé'), { target: { value: 'Énoncé' } });
		for (const l of ['A', 'B', 'C', 'D']) await fireEvent.input(e.getByLabelText(`Proposition ${l}`), { target: { value: `Proposition ${l}${l}` } });
		await fireEvent.click(e.getByLabelText(/Bonne réponse :\s*B/));
		await fireEvent.input(e.getByLabelText(/^Explication/), { target: { value: 'Parce que' } });
		await fireEvent.change(e.getByLabelText('Thème'), { target: { value: 't1' } });
		await fireEvent.change(e.getByLabelText('Niveau'), { target: { value: 'n1' } });
		await fireEvent.input(e.getByLabelText('Ajouter une règle'), { target: { value: '19.3' } });
		await fireEvent.click(await e.findByRole('button', { name: /19.3.1.4/ }));
		await fireEvent.click(e.getByRole('button', { name: 'Valider la question' }));
		expect(await e.findByText('Explication très courte : citez la règle et dites pourquoi.')).toBeInTheDocument();
		expect(h.enregistrerQuestion).not.toHaveBeenCalled();
		await fireEvent.click(e.getByRole('button', { name: 'Valider quand même' }));
		await waitFor(() => expect(h.enregistrerQuestion).toHaveBeenCalledTimes(1));
	});
});
