import { describe, expect, test } from 'vitest';
import {
	choisir,
	debutValidation,
	echecValidation,
	etatInitial,
	finValidation,
	suivante,
	type QuestionSeance,
	type ResultatValidation
} from '../../src/lib/seance/pedagogique';

const q = (n: number): QuestionSeance => ({
	ordre: n,
	question_id: `q${n}`,
	enonce: `Énoncé ${n}`,
	theme: 'Le Libéro',
	niveau: 'Niveau 2',
	role_cible: 'arbitre',
	video_url: null,
	propositions: ['A', 'B', 'C', 'D'].map((l) => ({ id: `q${n}-${l}`, lettre: l as 'A', texte: l })),
	deja_repondue: false
});
const res = (correcte: boolean): ResultatValidation => ({
	correcte,
	bonne_proposition_id: 'q1-B',
	explication: 'Parce que.',
	sources: [{ source: 'fivb_regles', edition: 'Règles', reference: '19.3.1.4', texte: 't', texte_original: null, principale: true }]
});
const depart = () => etatInitial([q(1), q(2)], 5, 1);

describe('séance pédagogique', () => {
	test('état initial : première question, compteurs repris', () => {
		expect(depart()).toMatchObject({ index: 0, choix: null, resultat: null, acquises: 5, aRevoir: 1, envoi: 'repos', terminee: false });
	});

	test('choisir puis valider envoie la réponse', () => {
		const e = debutValidation(choisir(depart(), 'q1-A'));
		expect(e.envoi).toBe('en_cours');
		expect(e.choix).toBe('q1-A');
	});

	test('valider sans choix ne fait rien', () => {
		expect(debutValidation(depart())).toEqual(depart());
	});

	test('double clic : debutValidation pendant un envoi ne change rien', () => {
		const e = debutValidation(choisir(depart(), 'q1-A'));
		expect(debutValidation(e)).toBe(e);
	});

	test('réponse juste : acquises + 1', () => {
		const e = finValidation(debutValidation(choisir(depart(), 'q1-B')), res(true));
		expect(e).toMatchObject({ acquises: 6, aRevoir: 1, envoi: 'repos' });
		expect(e.resultat?.correcte).toBe(true);
	});

	test('réponse fausse : à revoir + 1', () => {
		expect(finValidation(debutValidation(choisir(depart(), 'q1-A')), res(false))).toMatchObject({ acquises: 5, aRevoir: 2 });
	});

	test('après correction, le choix ne change plus', () => {
		const e = finValidation(debutValidation(choisir(depart(), 'q1-A')), res(false));
		expect(choisir(e, 'q1-C').choix).toBe('q1-A');
	});

	test('échec réseau : envoi en erreur, choix conservé', () => {
		const e = echecValidation(debutValidation(choisir(depart(), 'q1-A')));
		expect(e).toMatchObject({ envoi: 'erreur', choix: 'q1-A', resultat: null });
	});

	test('suivante : question suivante, choix et résultat remis à zéro', () => {
		const e = suivante(finValidation(debutValidation(choisir(depart(), 'q1-A')), res(false)));
		expect(e).toMatchObject({ index: 1, choix: null, resultat: null, terminee: false });
	});

	test('suivante sur la dernière question : séance terminée, index inchangé', () => {
		const surQ2 = suivante(finValidation(debutValidation(choisir(depart(), 'q1-A')), res(false)));
		const e = suivante(finValidation(debutValidation(choisir(surQ2, 'q2-A')), res(true)));
		expect(e).toMatchObject({ index: 1, terminee: true });
	});

	test('suivante sans correction ne fait rien', () => {
		expect(suivante(choisir(depart(), 'q1-A')).index).toBe(0);
	});
});
