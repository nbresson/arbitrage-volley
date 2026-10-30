// Bilan de séance : les questions ratées lues en base (et non accumulées dans le navigateur).
import { afterAll, beforeAll, expect, test } from 'vitest';
import { creerComptesDeTest, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin, unique } from './client';

let c: ComptesDeTest;
let themeId = '';
let regle: { id: string; reference: string } = { id: '', reference: '' };
let seance = '';
const qs: Awaited<ReturnType<typeof creerQuestion>>[] = [];

beforeAll(async () => {
	c = await creerComptesDeTest();
	themeId = (await admin.from('themes').insert({ libelle: `Thème erreurs bilan ${unique()}`, ordre: 965 }).select('id').single()).data!.id;
	regle = (await admin.from('regles').select('id, reference').limit(1).single()).data!;
	for (let i = 0; i < 2; i++) qs.push(await creerQuestion({ themeId }));
	await admin.from('question_regles').insert({ question_id: qs[0].id, regle_id: regle.id, principale: true });
	seance = (await c.stagiaireA.rpc('creer_seance', { p_type: 'pedagogique', p_theme_ids: [themeId], p_regle_id: null, p_niveau_id: null, p_role: null, p_nb: 5, p_duree_minutes: null })).data;
	await c.stagiaireA.rpc('valider_reponse', { p_seance: seance, p_question: qs[0].id, p_proposition: qs[0].props.A });
	await c.stagiaireA.rpc('valider_reponse', { p_seance: seance, p_question: qs[1].id, p_proposition: qs[1].props.B });
}, 90000);

afterAll(async () => {
	await admin.from('questions').delete().eq('theme_id', themeId);
	await admin.from('themes').delete().eq('id', themeId);
	await c.nettoyer();
});

test('les erreurs d’une séance, règle principale comprise', async () => {
	const { data, error } = await c.stagiaireA.rpc('erreurs_de_seance', { p_seance: seance });
	expect(error).toBeNull();
	expect(data).toHaveLength(1);
	expect(data[0].question_id).toBe(qs[0].id);
	expect(data[0].enonce).toMatch(/^Question de test/);
	expect(data[0].source).toMatchObject({ reference: regle.reference, principale: true });
	expect(data[0].source.edition).toEqual(expect.any(String));
});

test('un autre stagiaire : 42501', async () => {
	const { error } = await c.stagiaireB.rpc('erreurs_de_seance', { p_seance: seance });
	expect(error?.code).toBe('42501');
});
