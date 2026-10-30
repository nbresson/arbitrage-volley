// Lot E : questions liées à une règle, marque-pages, glossaire, figures.
import { afterAll, beforeAll, expect, test } from 'vitest';
import { creerComptesDeTest, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin, unique } from './client';

let c: ComptesDeTest;
let regle = '';
const qs: Awaited<ReturnType<typeof creerQuestion>>[] = [];
const terme = `Terme ${unique()}`;

beforeAll(async () => {
	c = await creerComptesDeTest();
	const { data } = await admin.from('regles').select('id').limit(1).single();
	regle = data!.id;
	qs.push(await creerQuestion(), await creerQuestion(), await creerQuestion({ statut: 'brouillon' }), await creerQuestion({ usage: 'reserve_examen' }));
	await admin.from('question_regles').insert(qs.map((q) => ({ question_id: q.id, regle_id: regle })));
}, 60000);

afterAll(async () => {
	await admin.from('questions').delete().in('id', qs.map((q) => q.id));
	await admin.from('glossaire').delete().eq('terme', terme);
	await admin.from('figures').delete().eq('reference', 'Fig.99');
	await c.nettoyer();
});

test('seules les questions validées d’entraînement comptent comme « questions liées »', async () => {
	const { data: liens } = await admin.from('question_regles').select('questions!inner(statut, usage)').eq('regle_id', regle);
	const attendu = (liens ?? []).filter((l: any) => l.questions.statut === 'validee' && l.questions.usage === 'entrainement').length;
	const { data, error } = await c.stagiaireA.rpc('nb_questions_regle', { p_regle: regle });
	expect(error).toBeNull();
	expect(data).toBe(attendu);
	expect(attendu).toBeGreaterThanOrEqual(2);
	expect(attendu).toBeLessThan((liens ?? []).length);
});

test('marque-pages : chacun ne voit que les siens', async () => {
	expect((await c.stagiaireA.from('regles_epinglees').insert({ regle_id: regle })).error).toBeNull();
	expect((await c.stagiaireA.from('regles_epinglees').select('regle_id')).data).toEqual([{ regle_id: regle }]);
	expect((await c.stagiaireB.from('regles_epinglees').select('regle_id')).data).toEqual([]);
	const { error } = await c.stagiaireB.from('regles_epinglees').insert({ regle_id: regle, stagiaire_id: c.ids.stagiaireA });
	expect(error).not.toBeNull();
	await c.stagiaireA.from('regles_epinglees').delete().eq('regle_id', regle);
	expect((await c.stagiaireA.from('regles_epinglees').select('regle_id')).data).toEqual([]);
});

test('glossaire : écrit par les formateurs, lu par tous', async () => {
	expect((await c.stagiaireA.from('glossaire').insert({ terme, definition: 'Une définition.' })).error).not.toBeNull();
	expect((await c.formateur.from('glossaire').insert({ terme, definition: 'Une définition de test.' })).error).toBeNull();
	const { data } = await c.stagiaireA.from('glossaire').select('terme, definition').eq('terme', terme);
	expect(data).toEqual([{ terme, definition: 'Une définition de test.' }]);
});

test('figures : référence au format Fig.N, image en https, écrites par les formateurs', async () => {
	expect((await c.stagiaireA.from('figures').insert({ reference: 'Fig.99', legende: 'x' })).error).not.toBeNull();
	expect((await c.formateur.from('figures').insert({ reference: 'Figure 99', legende: 'x' })).error).not.toBeNull();
	expect((await c.formateur.from('figures').insert({ reference: 'Fig.99', legende: 'x', image_url: 'http://exemple.fr/a.png' })).error).not.toBeNull();
	expect((await c.formateur.from('figures').insert({ reference: 'Fig.99', legende: 'Terrain de jeu', image_url: 'https://exemple.fr/a.png' })).error).toBeNull();
	expect((await c.stagiaireA.from('figures').select('legende').eq('reference', 'Fig.99')).data).toEqual([{ legende: 'Terrain de jeu' }]);
});
