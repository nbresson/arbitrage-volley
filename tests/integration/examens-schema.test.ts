import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { creerComptesDeTest, creerExamen, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin } from './client';

let c: ComptesDeTest;
let examen = '';
let question: Awaited<ReturnType<typeof creerQuestion>>;

beforeAll(async () => {
	c = await creerComptesDeTest();
	question = await creerQuestion({ usage: 'reserve_examen' });
	examen = await creerExamen(c.formateur);
	await admin.from('examen_codes').insert({ examen_id: examen, code: '123456' });
	await admin.from('examen_questions').insert({ examen_id: examen, question_id: question.id, ordre: 1 });
	await admin.from('inscriptions').insert([
		{ examen_id: examen, stagiaire_id: c.ids.stagiaireA },
		{ examen_id: examen, stagiaire_id: c.ids.stagiaireB }
	]);
	await admin.from('tentatives').insert({ examen_id: examen, stagiaire_id: c.ids.stagiaireA });
}, 60000);

afterAll(async () => {
	await admin.from('tentatives').delete().eq('examen_id', examen);
	await admin.from('examens_officiels').delete().eq('id', examen);
	await admin.from('questions').delete().eq('id', question.id);
	await c.nettoyer();
});

describe('examens officiels : formateur', () => {
	test('modifie un examen en brouillon', async () => {
		const { data } = await c.formateur.from('examens_officiels').update({ lieu: 'Gymnase' }).eq('id', examen).select('id');
		expect(data).toHaveLength(1);
	});

	test('ne modifie plus directement un examen ouvert', async () => {
		const autre = await creerExamen(c.formateur);
		await admin.from('examens_officiels').update({ statut: 'ouvert' }).eq('id', autre);
		const { data } = await c.formateur.from('examens_officiels').update({ seuil_reussite: 99 }).eq('id', autre).select('id');
		expect(data ?? []).toHaveLength(0);
		await admin.from('examens_officiels').delete().eq('id', autre);
	});

	test('lit les codes d’accès', async () => {
		const { data } = await c.formateur.from('examen_codes').select('code').eq('examen_id', examen);
		expect(data).toEqual([{ code: '123456' }]);
	});
});

describe('examens officiels : stagiaire', () => {
	test.each(['examens_officiels', 'examen_codes', 'examen_questions', 'tentative_reponses'])('ne lit rien dans %s', async (table) => {
		const { data } = await c.stagiaireA.from(table).select('*');
		expect(data ?? []).toEqual([]);
	});

	test('ne lit que ses propres inscriptions', async () => {
		const { data } = await c.stagiaireA.from('inscriptions').select('stagiaire_id').eq('examen_id', examen);
		expect(data).toEqual([{ stagiaire_id: c.ids.stagiaireA }]);
	});

	test('ne peut pas créer de tentative ni s’inscrire', async () => {
		const t = await c.stagiaireB.from('tentatives').insert({ examen_id: examen, stagiaire_id: c.ids.stagiaireB });
		expect(t.error).not.toBeNull();
		const i = await c.stagiaireB.from('inscriptions').insert({ examen_id: examen, stagiaire_id: c.ids.stagiaireB });
		expect(i.error).not.toBeNull();
	});
});

describe('examens officiels : contraintes', () => {
	test('une seule tentative par stagiaire et par examen', async () => {
		const { error } = await admin.from('tentatives').insert({ examen_id: examen, stagiaire_id: c.ids.stagiaireA });
		expect(error?.code).toBe('23505');
	});

	test('on ne désinscrit pas un stagiaire qui a commencé', async () => {
		const { error } = await admin.from('inscriptions').delete().eq('examen_id', examen).eq('stagiaire_id', c.ids.stagiaireA);
		expect(error?.code).toBe('23503');
	});

	test('on ne supprime pas une question utilisée par un examen', async () => {
		const { error } = await admin.from('questions').delete().eq('id', question.id);
		expect(error?.code).toBe('23503');
	});
});
