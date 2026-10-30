// « Revoir mes questions à revoir » : les questions dont la DERNIÈRE réponse pédagogique est fausse.
import { afterAll, beforeAll, expect, test } from 'vitest';
import { creerComptesDeTest, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin, nouveauClientAnonyme, unique } from './client';

let c: ComptesDeTest;
let themeId = '';
const qs: Awaited<ReturnType<typeof creerQuestion>>[] = [];

async function repondre(question: (typeof qs)[number], lettre: 'A' | 'B') {
	const { data: s } = await c.stagiaireA.rpc('creer_seance', { p_type: 'pedagogique', p_theme_ids: [themeId], p_regle_id: null, p_niveau_id: null, p_role: null, p_nb: 5, p_duree_minutes: null });
	await c.stagiaireA.rpc('valider_reponse', { p_seance: s, p_question: question.id, p_proposition: question.props[lettre] });
}

beforeAll(async () => {
	c = await creerComptesDeTest();
	themeId = (await admin.from('themes').insert({ libelle: `Thème à revoir ${unique()}`, ordre: 964 }).select('id').single()).data!.id;
	for (let i = 0; i < 3; i++) qs.push(await creerQuestion({ themeId }));
	await repondre(qs[0], 'A'); // ratée puis réussie : acquise
	await repondre(qs[0], 'B');
	await repondre(qs[1], 'A'); // ratée : à revoir
	await repondre(qs[2], 'B'); // réussie
}, 90000);

afterAll(async () => {
	await admin.from('questions').delete().eq('theme_id', themeId);
	await admin.from('themes').delete().eq('id', themeId);
	await c.nettoyer();
});

test('ne reprend que les questions dont la dernière réponse est fausse', async () => {
	const { data: id, error } = await c.stagiaireA.rpc('seance_a_revoir');
	expect(error).toBeNull();
	const { data } = await c.stagiaireA.rpc('questions_de_seance', { p_seance: id });
	expect(data.map((q: { question_id: string }) => q.question_id)).toEqual([qs[1].id]);
	const { data: s } = await c.stagiaireA.from('seances').select('type, filtre').eq('id', id).single();
	expect(s).toEqual({ type: 'pedagogique', filtre: { a_revoir: true } });
});

test('aucune question à revoir : message clair', async () => {
	const { error } = await c.stagiaireB.rpc('seance_a_revoir');
	expect(error?.message).toBe('Aucune question à revoir.');
});

test('anon : refusé', async () => {
	const { error } = await nouveauClientAnonyme().rpc('seance_a_revoir');
	expect(error).not.toBeNull();
});
