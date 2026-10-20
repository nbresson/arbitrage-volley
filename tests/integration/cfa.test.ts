import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { creerComptesDeTest, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin, unique } from './client';

let c: ComptesDeTest;
let ancienne = '';
let nouvelle = '';
let citee = '';
let libre = '';
let question: Awaited<ReturnType<typeof creerQuestion>>;
let activesAvant: string[] = [];

beforeAll(async () => {
	c = await creerComptesDeTest();
	const { data: actives } = await admin.from('editions').select('id').eq('source', 'cfa').eq('active', true);
	activesAvant = (actives ?? []).map((e) => e.id);
	const { data: eds } = await c.formateur
		.from('editions')
		.insert([
			{ source: 'cfa', libelle: `Consignes CFA test A ${unique()}`, active: true },
			{ source: 'cfa', libelle: `Consignes CFA test B ${unique()}`, active: false }
		])
		.select('id, active');
	ancienne = eds!.find((e) => e.active)!.id;
	nouvelle = eds!.find((e) => !e.active)!.id;
	const { data: rs } = await c.formateur
		.from('regles')
		.insert([
			{ edition_id: ancienne, reference: 'CFA 1.1', texte: 'Consigne citée' },
			{ edition_id: ancienne, reference: 'CFA 1.2', texte: 'Consigne libre' }
		])
		.select('id, reference');
	citee = rs!.find((r) => r.reference === 'CFA 1.1')!.id;
	libre = rs!.find((r) => r.reference === 'CFA 1.2')!.id;
	question = await creerQuestion();
	await admin.from('question_regles').insert({ question_id: question.id, regle_id: citee, principale: true });
}, 60000);

afterAll(async () => {
	await admin.from('questions').delete().eq('id', question.id);
	await admin.from('editions').delete().in('id', [ancienne, nouvelle]);
	if (activesAvant.length) await admin.from('editions').update({ active: true }).in('id', activesAvant);
	await c.nettoyer();
});

describe('activer une édition CFA', () => {
	test('refusé à un stagiaire', async () => {
		const { error } = await c.stagiaireA.rpc('activer_edition', { p_edition: nouvelle });
		expect(error?.code).toBe('42501');
	});

	test('désactive l’ancienne et marque à relire les questions validées liées', async () => {
		const { data, error } = await c.formateur.rpc('activer_edition', { p_edition: nouvelle });
		expect(error).toBeNull();
		expect(data).toBe(1);
		const { data: eds } = await admin.from('editions').select('id, active').in('id', [ancienne, nouvelle]);
		expect(Object.fromEntries(eds!.map((e) => [e.id, e.active]))).toEqual({ [ancienne]: false, [nouvelle]: true });
		const { data: q } = await admin.from('questions').select('a_relire').eq('id', question.id).single();
		expect(q!.a_relire).toBe(true);
	});
});

describe('supprimer une consigne', () => {
	test('refusé si une question validée la cite', async () => {
		const { error } = await c.formateur.from('regles').delete().eq('id', citee);
		expect(error?.message).toBe('Cette consigne est citée par une question validée : retirez-la d’abord de la question.');
	});

	test('accepté sinon', async () => {
		const { error } = await c.formateur.from('regles').delete().eq('id', libre);
		expect(error).toBeNull();
		const { data } = await admin.from('regles').select('id').eq('id', libre);
		expect(data).toEqual([]);
	});
});
