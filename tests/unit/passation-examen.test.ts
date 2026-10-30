// Écran commun d'examen : comportements que la revue finale V2 a relevés (accès à la base simulé par la source).
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';
import type { SourcePassation } from '../../src/lib/components/PassationExamen.svelte';
import { ErreurServeur } from '../../src/lib/data/seances';

const h = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: h.goto }));

import PassationExamen from '../../src/lib/components/PassationExamen.svelte';

const question = {
	questionId: 'q1',
	theme: 'Service',
	enonce: 'Le serveur frappe le ballon 9 secondes après le coup de sifflet.',
	propositions: (['A', 'B', 'C', 'D'] as const).map((l) => ({ valeur: l, lettre: l, texte: `Proposition ${l}` })),
	choisie: null,
	signalee: false
};

const source = (s: Partial<SourcePassation>): SourcePassation => ({
	cleFile: 'tentative-t1',
	titre: 'Examen officiel',
	sousTitre: 'Examen',
	urlResultat: '/tentative/t1/resultat',
	charger: async () => ({ debut: new Date().toISOString(), dureeMinutes: 10, fin: null, questions: [question] }),
	repondre: async () => {},
	signaler: async () => {},
	terminer: async () => {},
	...s
});

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
});

test('examen clos par le formateur pendant la passation : départ vers le résultat, file vidée', async () => {
	let appels = 0;
	const ecran = render(PassationExamen, {
		source: source({
			charger: async () => ({ debut: new Date().toISOString(), dureeMinutes: 10, fin: appels++ ? new Date().toISOString() : null, questions: appels > 1 ? [] : [question] }),
			repondre: async () => {
				throw new ErreurServeur('Cet examen est clos.', 'P0001');
			}
		})
	});
	await fireEvent.click(await ecran.findByLabelText(/Proposition B/));
	await fireEvent.click(ecran.getByRole('button', { name: 'Valider et continuer' }));
	await waitFor(() => expect(h.goto).toHaveBeenCalledWith('/tentative/t1/resultat', { replaceState: true }));
	expect(localStorage.getItem('tentative-t1')).toBeNull();
});

test('un refus qui ne tient pas au temps ne parle pas de l’horloge de l’appareil', async () => {
	const ecran = render(PassationExamen, {
		source: source({
			repondre: async () => {
				throw new ErreurServeur('Proposition invalide.', '42501');
			}
		})
	});
	await fireEvent.click(await ecran.findByLabelText(/Proposition B/));
	await fireEvent.click(ecran.getByRole('button', { name: 'Valider et continuer' }));
	const alerte = await ecran.findByText(/refusée/);
	expect(alerte.textContent).toContain('Proposition invalide.');
	expect(alerte.textContent).not.toMatch(/heure de votre appareil/);
});

test('heure du serveur : chronomètre et heure de réponse corrigés du décalage de l’appareil', async () => {
	const repondre = vi.fn(async () => {});
	const avance = 9 * 60_000; // l'appareil retarde de 9 minutes sur le serveur
	const ecran = render(PassationExamen, {
		source: source({
			charger: async () => ({ debut: new Date(Date.now() + avance).toISOString(), dureeMinutes: 10, fin: null, maintenant: new Date(Date.now() + avance + 9 * 60_000 + 2000).toISOString(), questions: [question] }),
			repondre
		})
	});
	// Début selon le serveur, 9 minutes écoulées selon le serveur : il reste moins d'une minute.
	expect(await ecran.findByRole('group', { name: /, 0 minutes \d+ restantes/ })).toBeInTheDocument();
	await fireEvent.click(ecran.getByLabelText(/Proposition B/));
	await fireEvent.click(ecran.getByRole('button', { name: 'Valider et continuer' }));
	await waitFor(() => expect(repondre).toHaveBeenCalled());
	const reponduLe = new Date((repondre.mock.calls[0] as unknown as [string, string, string])[2]).getTime();
	expect(Math.abs(reponduLe - (Date.now() + avance + 9 * 60_000))).toBeLessThan(5_000);
});

test('alerte de temps : bandeau à 5 minutes de la fin, absent avant', async () => {
	const ecran = render(PassationExamen, {
		source: source({ charger: async () => ({ debut: new Date(Date.now() - 7 * 60_000).toISOString(), dureeMinutes: 10, fin: null, questions: [question] }) })
	});
	await ecran.findByLabelText(/Proposition B/);
	expect(ecran.getByText(/Plus que 5 minutes\./).getAttribute('role')).toBe('status');
	ecran.unmount();
	const tot = render(PassationExamen, { source: source({}) });
	await tot.findByLabelText(/Proposition B/);
	expect(tot.queryByText(/Plus que 5 minutes/)).toBeNull();
});

test('hors ligne : réponses en attente visibles, puis « Connexion rétablie » et « Tout est envoyé »', async () => {
	let reseau = false;
	const ecran = render(PassationExamen, {
		source: source({
			repondre: async () => {
				if (!reseau) throw new Error('Failed to fetch');
			}
		})
	});
	await fireEvent.click(await ecran.findByLabelText(/Proposition B/));
	await fireEvent.click(ecran.getByRole('button', { name: 'Valider et continuer' }));
	expect(await ecran.findByText('1 réponse en attente d’envoi')).toBeInTheDocument();
	reseau = true;
	window.dispatchEvent(new Event('online'));
	expect(await ecran.findByText('Connexion rétablie, 1 réponse envoyée.')).toBeInTheDocument();
	expect(await ecran.findByText('Tout est envoyé')).toBeInTheDocument();
});

test('examen officiel : quitter l’écran est enregistré et signalé au retour', async () => {
	const noterSortie = vi.fn(async () => {});
	const ecran = render(PassationExamen, { source: source({ noterSortie }) });
	await ecran.findByLabelText(/Proposition B/);
	expect(ecran.getByText(/Restez sur cet écran : chaque sortie est enregistrée/)).toBeInTheDocument();
	Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
	document.dispatchEvent(new Event('visibilitychange'));
	Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
	expect(noterSortie).toHaveBeenCalledTimes(1);
	expect(await ecran.findByText(/votre sortie a été enregistrée/)).toBeInTheDocument();
});

test('examen blanc : aucune sortie enregistrée', async () => {
	const ecran = render(PassationExamen, { source: source({}) });
	await ecran.findByLabelText(/Proposition B/);
	expect(ecran.queryByText(/chaque sortie est enregistrée/)).toBeNull();
});

test('temps écoulé : départ vers le résultat avec l’annonce du nombre de réponses envoyées', async () => {
	render(PassationExamen, {
		source: source({ charger: async () => ({ debut: new Date(Date.now() - 11 * 60_000).toISOString(), dureeMinutes: 10, fin: null, questions: [{ ...question, choisie: 'B' }] }) })
	});
	await waitFor(() => expect(h.goto).toHaveBeenCalledWith('/tentative/t1/resultat?fin=auto&n=1'));
});

const question2 = { ...question, questionId: 'q2', enonce: 'Le libéro attaque au-dessus du filet.' };

test('réponse cochée puis grille : elle est enregistrée avant le changement de question', async () => {
	const repondre = vi.fn(async () => {});
	const ecran = render(PassationExamen, {
		source: source({ charger: async () => ({ debut: new Date().toISOString(), dureeMinutes: 10, fin: null, questions: [question, question2] }), repondre })
	});
	await fireEvent.click(await ecran.findByLabelText(/Proposition B/));
	await fireEvent.click(ecran.getByRole('button', { name: /Question 2, sans réponse/ }));
	await waitFor(() => expect(repondre).toHaveBeenCalledWith('q1', 'B', expect.any(String)));
	expect(await ecran.findByText(question2.enonce)).toBeInTheDocument();
	expect(ecran.getByRole('button', { name: /Question 1, répondue/ })).toBeInTheDocument();
});

test('réponse modifiée sur une question déjà répondue : la nouvelle valeur part aussi', async () => {
	const repondre = vi.fn(async () => {});
	const ecran = render(PassationExamen, {
		source: source({ charger: async () => ({ debut: new Date().toISOString(), dureeMinutes: 10, fin: null, questions: [{ ...question, choisie: 'A' }, question2] }), repondre })
	});
	await fireEvent.click(await ecran.findByRole('button', { name: /Question 1/ }));
	await fireEvent.click(ecran.getByLabelText(/Proposition C/));
	await fireEvent.click(ecran.getByRole('button', { name: /Question 2/ }));
	await waitFor(() => expect(repondre).toHaveBeenCalledWith('q1', 'C', expect.any(String)));
});

test('fin du temps : la réponse cochée part avant la clôture', async () => {
	const ordre: string[] = [];
	const ecran = render(PassationExamen, {
		source: source({
			charger: async () => ({ debut: new Date(Date.now() - 10 * 60_000 + 1500).toISOString(), dureeMinutes: 10, fin: null, questions: [question] }),
			repondre: async (q, v) => void ordre.push(`repondre ${q} ${v}`),
			terminer: async () => void ordre.push('terminer')
		})
	});
	await fireEvent.click(await ecran.findByLabelText(/Proposition B/));
	await waitFor(() => expect(ordre).toEqual(['repondre q1 B', 'terminer']), { timeout: 4000 });
});

test('fin du temps hors ligne : réponse cochée gardée et envoyée au retour', async () => {
	let reseau = false;
	const terminer = vi.fn(async () => {});
	const repondre = vi.fn(async () => {
		if (!reseau) throw new Error('Failed to fetch');
	});
	const ecran = render(PassationExamen, {
		source: source({ charger: async () => ({ debut: new Date(Date.now() - 10 * 60_000 + 1500).toISOString(), dureeMinutes: 10, fin: null, questions: [question] }), repondre, terminer })
	});
	await fireEvent.click(await ecran.findByLabelText(/Proposition B/));
	expect(await ecran.findByText(/Ne fermez pas cette page/, {}, { timeout: 4000 })).toBeInTheDocument();
	expect(terminer).not.toHaveBeenCalled();
	reseau = true;
	window.dispatchEvent(new Event('online'));
	await waitFor(() => expect(terminer).toHaveBeenCalled());
	expect(repondre).toHaveBeenLastCalledWith('q1', 'B', expect.any(String));
	await waitFor(() => expect(h.goto).toHaveBeenCalledWith('/tentative/t1/resultat?fin=auto&n=1'));
});

test('chargement en échec : pas de bouton « Terminer l’examen »', async () => {
	const ecran = render(PassationExamen, { source: source({ charger: async () => Promise.reject(new Error('réseau')) }) });
	await ecran.findByRole('button', { name: 'Réessayer' });
	expect(ecran.queryByRole('button', { name: 'Terminer l’examen' })).toBeNull();
});

test('tout est répondu : « Terminer et voir mon score »', async () => {
	const ecran = render(PassationExamen, { source: source({}) });
	await fireEvent.click(await ecran.findByLabelText(/Proposition B/));
	await fireEvent.click(ecran.getByRole('button', { name: 'Valider et continuer' }));
	expect(await ecran.findByRole('button', { name: 'Terminer et voir mon score', hidden: true })).toBeInTheDocument();
});

test('fin du temps : la réponse cochée est datée d’avant la limite, le serveur l’accepte', async () => {
	const debut = Date.now() - 10 * 60_000 + 1500;
	const acceptees: string[] = [];
	const terminer = vi.fn(async () => {});
	const ecran = render(PassationExamen, {
		source: source({
			charger: async () => ({ debut: new Date(debut).toISOString(), dureeMinutes: 10, fin: null, questions: [question] }),
			repondre: async (q, v, le) => {
				if (new Date(le).getTime() > debut + 10 * 60_000) throw new ErreurServeur('Le temps de l’examen est écoulé.');
				acceptees.push(`${q} ${v}`);
			},
			terminer
		})
	});
	await fireEvent.click(await ecran.findByLabelText(/Proposition B/));
	await waitFor(() => expect(terminer).toHaveBeenCalled(), { timeout: 4000 });
	expect(acceptees).toEqual(['q1 B']);
});

test('dialogue « Terminer » ouvert quand le temps s’écoule : il se ferme', async () => {
	const proto = HTMLDialogElement.prototype as unknown as { showModal: () => void; close: () => void };
	const [show, close] = [proto.showModal, proto.close];
	proto.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
	proto.close = function (this: HTMLDialogElement) { this.removeAttribute('open'); };
	try {
		const ecran = render(PassationExamen, {
			source: source({
				charger: async () => ({ debut: new Date(Date.now() - 10 * 60_000 + 1500).toISOString(), dureeMinutes: 10, fin: null, questions: [question] }),
				repondre: async () => Promise.reject(new Error('Failed to fetch'))
			})
		});
		await fireEvent.click(await ecran.findByLabelText(/Proposition B/));
		await fireEvent.click(ecran.getByRole('button', { name: 'Terminer l’examen' }));
		expect(document.querySelector('dialog')?.open).toBe(true);
		expect(await ecran.findByText(/Ne fermez pas cette page/, {}, { timeout: 4000 })).toBeInTheDocument();
		expect(document.querySelector('dialog')?.open).toBe(false);
	} finally {
		proto.showModal = show;
		proto.close = close;
	}
});

test('changer de question n’attend pas le réseau', async () => {
	const q2 = { ...question, questionId: 'q2', enonce: 'Deuxième énoncé de la passation.' };
	const ecran = render(PassationExamen, {
		source: source({
			charger: async () => ({ debut: new Date().toISOString(), dureeMinutes: 10, fin: null, questions: [question, q2] }),
			repondre: () => new Promise(() => {})
		})
	});
	await fireEvent.click(await ecran.findByLabelText(/Proposition B/));
	const cases = ecran.getByRole('navigation', { name: 'Aller à une question' }).querySelectorAll('button');
	await fireEvent.click(cases[1]);
	expect(await ecran.findByText('Deuxième énoncé de la passation.', {}, { timeout: 300 })).toBeInTheDocument();
});
