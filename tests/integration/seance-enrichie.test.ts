// Lot B : « je ne sais pas », explication des mauvaises réponses, passage surligné, questions marquées, signalements.
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { creerComptesDeTest, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin, unique } from './client';

let c: ComptesDeTest;
let themeId = '';
let regleId = '';
const qs: Awaited<ReturnType<typeof creerQuestion>>[] = [];

const creer = (client = c.stagiaireA, p: Record<string, unknown> = {}) =>
	client.rpc('creer_seance', { p_type: 'pedagogique', p_theme_ids: [themeId], p_regle_id: null, p_niveau_id: null, p_role: null, p_nb: 3, p_duree_minutes: null, ...p });

beforeAll(async () => {
	c = await creerComptesDeTest();
	const t = await admin.from('themes').insert({ libelle: `Thème enrichi ${unique()}`, ordre: 970 }).select('id').single();
	themeId = t.data!.id;
	const r = await admin.from('regles').select('id').limit(1).single();
	regleId = r.data!.id;
	for (let i = 0; i < 3; i++) qs.push(await creerQuestion({ themeId }));
	await admin.from('propositions').update({ explication: 'C est faux : le contact n’a pas gêné le jeu.' }).eq('id', qs[0].props.C);
	await admin.from('question_regles').insert({ question_id: qs[0].id, regle_id: regleId, principale: true, passage: 'est une faute' });
}, 60000);

afterAll(async () => {
	await admin.from('questions').delete().eq('theme_id', themeId);
	await admin.from('themes').delete().eq('id', themeId);
	await c.nettoyer();
});

describe('valider_reponse enrichie', () => {
	test('« je ne sais pas » : compte comme une erreur, sans proposition, avec la correction complète', async () => {
		const { data: id } = await creer();
		const { data, error } = await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: null });
		expect(error).toBeNull();
		expect(data).toMatchObject({ correcte: false, sans_reponse: true, bonne_proposition_id: qs[0].props.B });
		const { data: ligne } = await c.stagiaireA.from('reponses').select('proposition_id, correcte').eq('seance_id', id).single();
		expect(ligne).toEqual({ proposition_id: null, correcte: false });
	});

	test('une mauvaise réponse renvoie l’explication de la proposition choisie et le passage de la règle', async () => {
		const { data: id } = await creer();
		const { data } = await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: qs[0].props.C });
		expect(data.correcte).toBe(false);
		expect(data.explications_propositions).toEqual({ [qs[0].props.C]: 'C est faux : le contact n’a pas gêné le jeu.' });
		expect(data.sources[0]).toMatchObject({ passage: 'est une faute' });
	});

	test('en examen blanc, « je ne sais pas » est refusé', async () => {
		const { data: id } = await creer(c.stagiaireA, { p_type: 'examen_entrainement', p_duree_minutes: 30 });
		const { error } = await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: null });
		expect(error?.message).toBe('Proposition invalide.');
	});
});

describe('questions marquées', () => {
	test('le stagiaire marque une question ; un autre ne la voit pas', async () => {
		const { error } = await c.stagiaireA.from('questions_marquees').insert({ question_id: qs[1].id });
		expect(error).toBeNull();
		const { data: b } = await c.stagiaireB.from('questions_marquees').select('question_id');
		expect(b).toEqual([]);
		const { data: a } = await c.stagiaireA.from('questions_marquees').select('question_id');
		expect(a).toEqual([{ question_id: qs[1].id }]);
	});

	test('une séance faite des questions marquées', async () => {
		const { data: id, error } = await c.stagiaireA.rpc('seance_marquees');
		expect(error).toBeNull();
		const { data } = await c.stagiaireA.rpc('questions_de_seance', { p_seance: id });
		expect(data.map((q: { question_id: string }) => q.question_id)).toEqual([qs[1].id]);
	});

	test('sans question marquée : message clair', async () => {
		const { error } = await c.stagiaireB.rpc('seance_marquees');
		expect(error?.message).toBe('Aucune question marquée.');
	});
});

describe('signalements', () => {
	test('le stagiaire signale un problème ; le formateur le lit et le traite ; un autre stagiaire ne le voit pas', async () => {
		const { error } = await c.stagiaireA.from('signalements_question').insert({ question_id: qs[2].id, message: 'La proposition D est ambiguë.' });
		expect(error).toBeNull();
		expect((await c.stagiaireB.from('signalements_question').select('id')).data).toEqual([]);
		const { data: vus } = await c.formateur.from('signalements_question').select('id, message, traite_le').eq('question_id', qs[2].id);
		expect(vus).toHaveLength(1);
		expect(vus![0]).toMatchObject({ message: 'La proposition D est ambiguë.', traite_le: null });
		const { error: e2 } = await c.formateur.from('signalements_question').update({ traite_le: new Date().toISOString() }).eq('id', vus![0].id);
		expect(e2).toBeNull();
		const { data: apres } = await c.formateur.from('signalements_question').select('traite_le').eq('id', vus![0].id).single();
		expect(apres!.traite_le).not.toBeNull();
	});

	test('un stagiaire ne peut pas signaler au nom d’un autre', async () => {
		const { error } = await c.stagiaireA.from('signalements_question').insert({ question_id: qs[2].id, message: 'x', stagiaire_id: c.ids.stagiaireB });
		expect(error).not.toBeNull();
	});
});
