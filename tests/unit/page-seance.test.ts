// Séance pédagogique : enchaînement des questions (focus, annonce, suite sous la décision) et bilan.
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({
	questions: vi.fn(),
	valider: vi.fn(),
	terminer: vi.fn(),
	erreurs: vi.fn(async () => [] as unknown[])
}));
vi.mock('$app/state', () => ({ page: { params: { seance: 's1' }, url: new URL('http://x/entrainement/s1') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), onNavigate: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: true, profil: null }, chargerProfil: vi.fn(), seDeconnecter: vi.fn() }));
vi.mock('#lib/data/marquees.ts', () => ({ mesMarquees: async () => new Set(), marquer: vi.fn(), seanceMarquees: vi.fn(), seanceARevoir: vi.fn() }));
vi.mock('#lib/data/seances.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/seances')>()),
	questionsDeSeance: h.questions,
	validerReponse: h.valider,
	terminerSeance: h.terminer,
	erreursDeSeance: h.erreurs
}));

import Seance from '../../src/routes/entrainement/[seance]/+page.svelte';

const q = (n: number, faite: boolean | null = null) => ({
	ordre: n, question_id: `q${n}`, enonce: `Énoncé ${n}`, theme: 'Service', niveau: 'N1', role_cible: 'arbitre', video_url: null,
	propositions: (['A', 'B', 'C', 'D'] as const).map((l) => ({ id: `q${n}${l}`, lettre: l, texte: `Proposition ${l}` })),
	deja_repondue: faite !== null, correcte_precedente: faite, proposition_choisie: null, signalee: false
});
const resultat = (n: number, correcte: boolean) => ({
	correcte, bonne_proposition_id: `q${n}B`, explication: 'Parce que.',
	sources: [{ source: 'fivb_regles', edition: 'Règles', reference: '12.4', texte: 'Texte', texte_original: null, principale: true }]
});

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
	h.questions.mockResolvedValue([q(1), q(2), q(3)]);
	h.valider.mockImplementation(async (_s: string, qid: string) => resultat(Number(qid.slice(1)), false));
	h.terminer.mockResolvedValue({ score: 0, total: 3, par_theme: [] });
});

async function repondre(e: ReturnType<typeof render>) {
	await fireEvent.click(await e.findByLabelText(/Proposition A/));
	await fireEvent.click(e.getByRole('button', { name: 'Valider ma réponse' }));
	await e.findAllByRole('button', { name: 'Question suivante' });
}

test('après « Question suivante », le focus est sur l’énoncé et « Question 2 sur 3 » est annoncé', async () => {
	const e = render(Seance);
	await repondre(e);
	await fireEvent.click(e.getAllByRole('button', { name: 'Question suivante' })[0]);
	await waitFor(() => expect(document.activeElement?.id).toBe('enonce'));
	expect(document.activeElement?.textContent).toBe('Énoncé 2');
	expect(e.getAllByRole('status').some((s) => s.textContent === 'Question 2 sur 3')).toBe(true);
});

test('après correction, un second bouton « Question suivante » suit le panneau de décision', async () => {
	const e = render(Seance);
	await repondre(e);
	const boutons = e.getAllByRole('button', { name: 'Question suivante' });
	expect(boutons).toHaveLength(2);
	const decision = e.container.querySelector('.decision-bloc')!;
	expect(decision.compareDocumentPosition(boutons[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	await fireEvent.click(boutons[1]);
	expect(await e.findByText('Énoncé 2')).toBeInTheDocument();
});
