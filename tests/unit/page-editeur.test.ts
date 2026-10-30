// Banque et éditeur de questions : filtre par défaut, erreurs guidées, relecture continue, dépublication confirmée.
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({
	params: { id: 'q1' } as Record<string, string>,
	url: new URL('http://x/formateur/questions/q1'),
	enregistrer: vi.fn(),
	charger: vi.fn(),
	lister: vi.fn()
}));
vi.mock('$app/state', () => ({ page: { get params() { return h.params; }, get url() { return h.url; } } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), onNavigate: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: true, profil: null }, chargerProfil: vi.fn(), seDeconnecter: vi.fn() }));
vi.mock('#lib/data/signalements.ts', () => ({ signalementsDeQuestion: async () => [], signalementsNonTraites: async () => new Map(), traiterSignalement: vi.fn() }));
vi.mock('#lib/data/questions.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/questions')>()),
	enregistrerQuestion: h.enregistrer,
	chargerQuestion: h.charger,
	listerQuestions: h.lister,
	historiqueQuestion: async () => [],
	tauxQuestions: async () => new Map(),
	archiverQuestion: vi.fn()
}));
vi.mock('#lib/data/regles.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/regles')>()),
	toutesLesRegles: async () => [{ id: 'r1', edition: 'Règles', source: 'fivb_regles', reference: '19.3.1.4', parent_reference: null, titre: null, texte: 'Texte', texte_original: null, renvois: [], video_url: null }]
}));
vi.mock('#lib/data/seances.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/seances')>()),
	referentiel: async () => ({ themes: [{ id: 't1', libelle: 'Le Libéro' }], niveaux: [{ id: 'n1', libelle: 'Niveau 1' }] }),
	seanceEnCours: async () => false
}));

import Banque from '../../src/routes/formateur/questions/+page.svelte';
import Edition from '../../src/routes/formateur/questions/[id]/+page.svelte';

const ligne = (id: string, statut: string, ref: string | null = null) => ({
	id, enonce: `Énoncé ${id}`, statut, a_relire: false, origine: 'manuelle', role_cible: 'arbitre', usage: 'entrainement', theme: 'Le Libéro', niveau: 'Niveau 1', theme_id: 't1', niveau_id: 'n1', reference_origine: ref
});
const chargee = (id: string, statut = 'brouillon', themeId: string | null = 't1') => ({
	id, statut, a_relire: false, origine: null,
	reglesLiees: [{ id: 'r1', reference: '19.3.1.4', edition: 'Règles', principale: true }],
	formulaire: {
		enonce: 'Le libéro peut-il servir ?',
		propositions: [['A', 'Oui, toujours'], ['B', 'Non, jamais'], ['C', 'Seulement au deuxième set'], ['D', 'Si le capitaine l’accepte']].map(([lettre, texte]) => ({ lettre, texte })),
		bonne: 'B', explication: 'Non : la règle 19.3.1.2 interdit au libéro de servir.', themeId, niveauId: 'n1', roleCible: 'arbitre', usage: 'entrainement', videoUrl: '',
		regles: [{ id: 'r1', principale: true }]
	}
});

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
	h.params = { id: 'q1' };
	h.url = new URL('http://x/formateur/questions/q1');
	h.lister.mockResolvedValue([ligne('q1', 'brouillon', 'Cas 1.1'), ligne('q2', 'brouillon', 'Cas 1.2'), ligne('q3', 'validee')]);
	h.charger.mockImplementation(async (id: string) => chargee(id));
	h.enregistrer.mockImplementation(async (id: string) => id);
});

test('banque : filtre Statut « Tous » par défaut', async () => {
	const e = render(Banque);
	expect(await e.findByText('Énoncé q3')).toBeInTheDocument();
	expect((e.getByLabelText('Statut') as HTMLSelectElement).value).toBe('');
});

test('erreurs de validation : liste de liens vers les champs, focus sur le premier champ invalide', async () => {
	h.charger.mockImplementation(async (id: string) => chargee(id, 'brouillon', null));
	const e = render(Edition);
	await e.findByLabelText('Énoncé');
	await fireEvent.click(e.getByRole('button', { name: 'Valider la question' }));
	const lien = await e.findByRole('link', { name: 'Thème' });
	expect(lien.getAttribute('href')).toBe('#champ-theme');
	const theme = e.getByLabelText('Thème');
	expect(theme).toHaveAttribute('aria-invalid', 'true');
	await waitFor(() => expect(document.activeElement).toBe(theme));
});

test('après validation en relecture, « Relire le brouillon suivant » est le bouton principal et garde ?relecture', async () => {
	h.url = new URL('http://x/formateur/questions/q1?relecture');
	const e = render(Edition);
	await e.findByText(/Relecture des brouillons/);
	await fireEvent.click(e.getByRole('button', { name: 'Valider la question' }));
	const suivant = await e.findByRole('link', { name: 'Relire le brouillon suivant' });
	expect(suivant.getAttribute('href')).toBe('/formateur/questions/q2?relecture');
	expect(suivant.classList.contains('btn')).toBe(true);
});

test('« Repasser en brouillon… » demande confirmation', async () => {
	h.charger.mockImplementation(async (id: string) => chargee(id, 'validee'));
	const e = render(Edition);
	await fireEvent.click(await e.findByRole('button', { name: 'Repasser en brouillon…' }));
	expect(h.enregistrer).not.toHaveBeenCalled();
	expect(e.getByText('Elle ne sera plus proposée aux stagiaires jusqu’à sa revalidation.')).toBeInTheDocument();
	await fireEvent.click(e.getByRole('button', { name: 'Repasser en brouillon', hidden: true }));
	await waitFor(() => expect(h.enregistrer).toHaveBeenCalledWith('q1', expect.anything(), false));
});
