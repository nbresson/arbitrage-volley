// Lot H : historique des modifications d'une question, taux de réussite par question.
import { afterAll, beforeAll, expect, test } from 'vitest';
import { creerComptesDeTest, type ComptesDeTest } from './aide-comptes';
import { admin, unique } from './client';

let c: ComptesDeTest;
let themeId = '';
let niveauId = '';
let regleId = '';
let id = '';

const donnees = (enonce: string, texteA = 'Proposition A') => ({
	enonce,
	explication: 'Explication',
	themeId,
	niveauId,
	roleCible: 'arbitre',
	usage: 'entrainement',
	videoUrl: '',
	bonne: 'B',
	propositions: [
		{ lettre: 'A', texte: texteA },
		{ lettre: 'B', texte: 'Proposition B' },
		{ lettre: 'C', texte: 'Proposition C' },
		{ lettre: 'D', texte: 'Proposition D' }
	],
	regles: [{ id: regleId, principale: true }]
});

beforeAll(async () => {
	c = await creerComptesDeTest();
	themeId = (await admin.from('themes').insert({ libelle: `Thème histo ${unique()}`, ordre: 962 }).select('id').single()).data!.id;
	niveauId = (await admin.from('niveaux').select('id').limit(1).single()).data!.id;
	regleId = (await admin.from('regles').select('id').limit(1).single()).data!.id;
}, 60000);

afterAll(async () => {
	if (id) await admin.from('questions').delete().eq('id', id);
	await admin.from('themes').delete().eq('id', themeId);
	await c.nettoyer();
});

test('création, puis modification de l’énoncé et d’une proposition, puis validation : trois lignes d’historique', async () => {
	const r1 = await c.formateur.rpc('enregistrer_question', { p_id: null, p_donnees: donnees('Énoncé v1'), p_valider: false });
	expect(r1.error?.message ?? null).toBeNull();
	id = r1.data;
	await c.formateur.rpc('enregistrer_question', { p_id: id, p_donnees: donnees('Énoncé v2', 'Autre A'), p_valider: false });
	await c.formateur.rpc('enregistrer_question', { p_id: id, p_donnees: donnees('Énoncé v2', 'Autre A'), p_valider: true });
	const { data } = await c.formateur.from('questions_historique').select('resume, auteur_id').eq('question_id', id).order('id');
	expect(data!.map((l) => l.resume)).toEqual(['Création', 'énoncé, proposition A', 'validée']);
	expect(data!.every((l) => l.auteur_id === c.ids.formateur)).toBe(true);
});

test('l’historique et les taux sont réservés aux formateurs', async () => {
	expect((await c.stagiaireA.from('questions_historique').select('id').eq('question_id', id)).data).toEqual([]);
	expect((await c.stagiaireA.rpc('taux_questions')).error?.code).toBe('42501');
});

test('taux de réussite en mode pédagogique', async () => {
	const { data: s } = await c.stagiaireA.rpc('creer_seance', { p_type: 'pedagogique', p_theme_ids: [themeId], p_regle_id: null, p_niveau_id: null, p_role: null, p_nb: 5, p_duree_minutes: null });
	const { data: props } = await admin.from('propositions').select('id, lettre').eq('question_id', id);
	await c.stagiaireA.rpc('valider_reponse', { p_seance: s, p_question: id, p_proposition: props!.find((p) => p.lettre === 'A')!.id });
	const { data } = await c.formateur.rpc('taux_questions');
	expect(data.find((l: { question_id: string }) => l.question_id === id)).toEqual({ question_id: id, reponses: 1, justes: 0 });
});
