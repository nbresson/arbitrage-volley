// Pages de l'examen officiel côté stagiaire (accès à la base simulé).
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ErreurServeur } from '../../src/lib/data/seances';

const h = vi.hoisted(() => ({
	params: {} as Record<string, string>,
	goto: vi.fn(),
	mesConvocations: vi.fn(),
	commencerTentative: vi.fn(),
	mesurerConnexion: vi.fn(async () => ({ etat: 'stable', texte: 'Connexion stable.' })),
	infoTentative: vi.fn(),
	bilanTentative: vi.fn()
}));

vi.mock('$app/state', () => ({ page: { get params() { return h.params; }, url: new URL('http://x/') } }));
vi.mock('$app/navigation', () => ({ goto: h.goto }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: true, profil: null }, chargerProfil: vi.fn(), seDeconnecter: vi.fn() }));
vi.mock('#lib/data/examens-officiels.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/examens-officiels')>()),
	mesConvocations: h.mesConvocations,
	commencerTentative: h.commencerTentative,
	mesurerConnexion: h.mesurerConnexion,
	infoTentative: h.infoTentative,
	bilanTentative: h.bilanTentative
}));

import SaisieCode from '../../src/routes/examen-officiel/[examen]/+page.svelte';
import Resultat from '../../src/routes/tentative/[tentative]/resultat/+page.svelte';

const convocation = {
	examen_id: 'e1', titre: 'Examen de fin de module', date_heure: '2026-11-01T09:00:00Z', lieu: 'Salle 2', duree_minutes: 45,
	nb_questions: 30, formateur: 'Ana Formatrice', statut: 'ouvert', tentative_id: null, terminee: false
};

beforeEach(() => {
	vi.clearAllMocks();
	h.mesConvocations.mockResolvedValue([convocation]);
});

describe('saisie du code', () => {
	test('le bouton reste désactivé tant que le code n’a pas 6 chiffres', async () => {
		h.params = { examen: 'e1' };
		const ecran = render(SaisieCode);
		const champ = await ecran.findByLabelText('Chiffre 1 sur 6');
		const bouton = ecran.getByRole('button', { name: 'Commencer l’examen' });
		await fireEvent.input(champ, { target: { value: '12 34' } });
		expect(bouton).toBeDisabled();
		await fireEvent.input(champ, { target: { value: '12 34 56' } });
		expect(bouton).toBeEnabled();
	});

	test('un code refusé s’affiche et la saisie reste', async () => {
		h.params = { examen: 'e1' };
		h.commencerTentative.mockRejectedValue(new ErreurServeur('Code d’accès incorrect.', 'P0001'));
		const ecran = render(SaisieCode);
		const champ = await ecran.findByLabelText('Chiffre 1 sur 6');
		await fireEvent.input(champ, { target: { value: '000000' } });
		await fireEvent.click(ecran.getByRole('button', { name: 'Commencer l’examen' }));
		expect(await ecran.findByRole('alert')).toHaveTextContent('Code d’accès incorrect.');
		expect(ecran.getAllByLabelText(/Chiffre/).map((c) => (c as HTMLInputElement).value).join('')).toBe('000000');
		expect(h.goto).not.toHaveBeenCalled();
	});

	test('un code accepté ouvre la tentative', async () => {
		h.params = { examen: 'e1' };
		h.commencerTentative.mockResolvedValue('t1');
		const ecran = render(SaisieCode);
		const champ = await ecran.findByLabelText('Chiffre 1 sur 6');
		await fireEvent.input(champ, { target: { value: '123456' } });
		await fireEvent.click(ecran.getByRole('button', { name: 'Commencer l’examen' }));
		await waitFor(() => expect(h.goto).toHaveBeenCalledWith('/tentative/t1'));
		expect(h.commencerTentative).toHaveBeenCalledWith('e1', '123456');
	});
});

describe('salle d’attente', () => {
	test('écran d’attente avec l’heure et le lieu, test de connexion, convocation imprimable', async () => {
		h.params = { examen: 'e1' };
		const ecran = render(SaisieCode);
		expect(await ecran.findByText('L’examen commence quand votre formateur donne le code.')).toBeInTheDocument();
		expect(ecran.getByText(/Salle 2/)).toBeInTheDocument();
		expect(await ecran.findByText('Connexion stable.')).toBeInTheDocument();
		expect(ecran.getByRole('link', { name: 'Imprimer la convocation' }).getAttribute('href')).toBe('/convocation/e1');
	});

	test('examen pas encore ouvert : code et bouton désactivés, message d’attente', async () => {
		h.params = { examen: 'e1' };
		h.mesConvocations.mockResolvedValue([{ ...convocation, statut: 'brouillon' }]);
		const ecran = render(SaisieCode);
		expect(await ecran.findByText(/pas encore ouvert l’examen/)).toBeInTheDocument();
		expect(ecran.getByLabelText('Chiffre 1 sur 6')).toBeDisabled();
		expect(ecran.getByRole('button', { name: 'Commencer l’examen' })).toBeDisabled();
	});
});

describe('résultat de l’examen officiel', () => {
	test('une tentative en cours n’est pas terminée par la page', async () => {
		h.params = { tentative: 't1' };
		h.infoTentative.mockResolvedValue({ id: 't1', examen_id: 'e1', titre: 'Examen', debut: new Date().toISOString(), fin: null, duree_minutes: 45, nb_questions: 30 });
		render(Resultat);
		await waitFor(() => expect(h.goto).toHaveBeenCalledWith('/tentative/t1', { replaceState: true }));
		expect(h.bilanTentative).not.toHaveBeenCalled();
	});

	test('affiche non réussi et le seuil, sans lien pour revoir', async () => {
		h.params = { tentative: 't1' };
		h.infoTentative.mockResolvedValue({ id: 't1', examen_id: 'e1', titre: 'Examen', debut: '', fin: new Date().toISOString(), duree_minutes: 45, nb_questions: 30 });
		h.bilanTentative.mockResolvedValue({ score: 18, total: 30, seuil: 21, reussi: false, par_theme: [{ theme: 'Le filet', justes: 3, total: 6 }] });
		const ecran = render(Resultat);
		expect(await ecran.findByText('Non réussi')).toBeInTheDocument();
		expect(ecran.getByText('Seuil de réussite : 21 / 30')).toBeInTheDocument();
		expect(ecran.queryByRole('link', { name: /Revoir/ })).toBeNull();
	});

	test('résultat contextualisé : date, lieu, et le détail chez le formateur', async () => {
		h.params = { tentative: 't1' };
		h.infoTentative.mockResolvedValue({ id: 't1', examen_id: 'e1', titre: 'Examen', debut: '', fin: new Date().toISOString(), duree_minutes: 45, nb_questions: 30, date_heure: '2026-11-01T09:00:00Z', lieu: 'Salle 2' });
		h.bilanTentative.mockResolvedValue({ score: 24, total: 30, seuil: 21, reussi: true, par_theme: [] });
		const ecran = render(Resultat);
		expect(await ecran.findByText(/1 novembre 2026.*Salle 2/)).toBeInTheDocument();
		expect(ecran.getByText(/Votre formateur a le détail de vos réponses/)).toBeInTheDocument();
	});
});
