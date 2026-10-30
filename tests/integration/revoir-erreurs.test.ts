// « Revoir mes erreurs » : une nouvelle séance pédagogique faite des questions ratées d'une séance du stagiaire.
import { afterAll, beforeAll, expect, test } from 'vitest';
import { creerComptesDeTest, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin, unique } from './client';

let c: ComptesDeTest;
let themeId = '';
let seance = '';
const qs: Awaited<ReturnType<typeof creerQuestion>>[] = [];

beforeAll(async () => {
	c = await creerComptesDeTest();
	const t = await admin.from('themes').insert({ libelle: `Thème erreurs ${unique()}`, ordre: 960 }).select('id').single();
	themeId = t.data!.id;
	for (let i = 0; i < 4; i++) qs.push(await creerQuestion({ themeId }));
	const { data, error } = await c.stagiaireA.rpc('creer_seance', {
		p_type: 'pedagogique',
		p_theme_ids: [themeId],
		p_regle_id: null,
		p_niveau_id: null,
		p_role: null,
		p_nb: 4,
		p_duree_minutes: null
	});
	if (error) throw error;
	seance = data;
	// Questions 0 et 1 ratées, 2 juste, 3 sans réponse.
	await admin.from('reponses').insert([
		{ seance_id: seance, question_id: qs[0].id, proposition_id: qs[0].props.C, correcte: false },
		{ seance_id: seance, question_id: qs[1].id, proposition_id: qs[1].props.A, correcte: false },
		{ seance_id: seance, question_id: qs[2].id, proposition_id: qs[2].props.B, correcte: true }
	]);
}, 60000);

afterAll(async () => {
	await admin.from('questions').delete().eq('theme_id', themeId);
	await admin.from('themes').delete().eq('id', themeId);
	await c.nettoyer();
});

test('la nouvelle séance contient exactement les questions ratées', async () => {
	const { data: id, error } = await c.stagiaireA.rpc('revoir_erreurs', { p_seance: seance });
	expect(error).toBeNull();
	expect(id).not.toBe(seance);
	const { data } = await c.stagiaireA.rpc('questions_de_seance', { p_seance: id });
	expect(new Set(data.map((q: { question_id: string }) => q.question_id))).toEqual(new Set([qs[0].id, qs[1].id]));
	const { data: s } = await c.stagiaireA.from('seances').select('type, nb_questions').eq('id', id).single();
	expect(s).toEqual({ type: 'pedagogique', nb_questions: 2 });
});

test('une question repassée en brouillon depuis n’est plus reprise', async () => {
	await admin.from('questions').update({ statut: 'brouillon' }).eq('id', qs[1].id);
	const { data: id } = await c.stagiaireA.rpc('revoir_erreurs', { p_seance: seance });
	const { data } = await c.stagiaireA.rpc('questions_de_seance', { p_seance: id });
	expect(data.map((q: { question_id: string }) => q.question_id)).toEqual([qs[0].id]);
	await admin.from('questions').update({ statut: 'validee' }).eq('id', qs[1].id);
});

test('un autre stagiaire ne peut pas réutiliser cette séance', async () => {
	const { error } = await c.stagiaireB.rpc('revoir_erreurs', { p_seance: seance });
	expect(error?.code).toBe('42501');
});

test('sans erreur : message clair', async () => {
	await admin.from('reponses').update({ correcte: true }).eq('seance_id', seance);
	const { error } = await c.stagiaireA.rpc('revoir_erreurs', { p_seance: seance });
	expect(error?.message).toBe('Aucune erreur à revoir dans cette séance.');
});
