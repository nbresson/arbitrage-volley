import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { creerComptesDeTest, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin, nouveauClientAnonyme } from './client';

let c: ComptesDeTest;
const q: Record<string, Awaited<ReturnType<typeof creerQuestion>>> = {};
let seancePedagoA = '';
let seanceExamenA = '';

beforeAll(async () => {
	c = await creerComptesDeTest();
	q.validee = await creerQuestion();
	q.brouillon = await creerQuestion({ statut: 'brouillon' });
	q.reserve = await creerQuestion({ usage: 'reserve_examen' });
	q.archivee = await creerQuestion({ statut: 'archivee' });
	const s = await admin
		.from('seances')
		.insert([
			{ stagiaire_id: c.ids.stagiaireA, type: 'pedagogique', nb_questions: 1 },
			{ stagiaire_id: c.ids.stagiaireA, type: 'examen_entrainement', nb_questions: 1, duree_minutes: 10 }
		])
		.select('id, type');
	seancePedagoA = s.data!.find((x) => x.type === 'pedagogique')!.id;
	seanceExamenA = s.data!.find((x) => x.type === 'examen_entrainement')!.id;
	await admin.from('reponses').insert([
		{ seance_id: seancePedagoA, question_id: q.validee.id, proposition_id: q.validee.props.A, correcte: false },
		{ seance_id: seanceExamenA, question_id: q.validee.id, proposition_id: q.validee.props.B, correcte: true }
	]);
}, 60000);

afterAll(async () => {
	await admin.from('questions').delete().in('id', Object.values(q).map((x) => x.id));
	await c.nettoyer();
});

const ids = (rows: { id: string }[] | null) => (rows ?? []).map((r) => r.id);

describe('règles d’accès : stagiaire', () => {
	test('ne voit que les questions validées d’entraînement', async () => {
		const { data } = await c.stagiaireA.from('questions').select('id').in('id', Object.values(q).map((x) => x.id));
		expect(ids(data)).toEqual([q.validee.id]);
	});

	test('ne voit les propositions que des questions qu’il peut voir', async () => {
		const { data } = await c.stagiaireA.from('propositions').select('id, question_id').in('question_id', [q.validee.id, q.reserve.id, q.brouillon.id]);
		expect(new Set((data ?? []).map((p) => p.question_id))).toEqual(new Set([q.validee.id]));
	});

	test('ne lit jamais les bonnes réponses', async () => {
		const { data } = await c.stagiaireA.from('bonnes_reponses').select('*');
		expect(data).toEqual([]);
	});

	test('ne peut pas écrire directement une réponse ni une séance', async () => {
		const r = await c.stagiaireA.from('reponses').insert({ seance_id: seancePedagoA, question_id: q.brouillon.id, proposition_id: q.brouillon.props.B, correcte: true });
		expect(r.error).not.toBeNull();
		const s = await c.stagiaireA.from('seances').insert({ stagiaire_id: c.ids.stagiaireA, type: 'pedagogique', nb_questions: 1 });
		expect(s.error).not.toBeNull();
	});

	test('A voit ses séances ; B ne voit ni les séances ni les réponses de A', async () => {
		expect(ids((await c.stagiaireA.from('seances').select('id')).data).sort()).toEqual([seanceExamenA, seancePedagoA].sort());
		expect((await c.stagiaireB.from('seances').select('id')).data).toEqual([]);
		expect((await c.stagiaireB.from('reponses').select('id')).data).toEqual([]);
	});

	test('ne peut pas modifier son rôle, mais peut accepter la notice', async () => {
		await c.stagiaireA.from('profils').update({ role: 'formateur' }).eq('id', c.ids.stagiaireA);
		const { data } = await admin.from('profils').select('role').eq('id', c.ids.stagiaireA).single();
		expect(data!.role).toBe('stagiaire');
		const n = await c.stagiaireA.from('profils').update({ notice_acceptee_le: new Date().toISOString() }).eq('id', c.ids.stagiaireA);
		expect(n.error).toBeNull();
	});

	test('ne peut pas modifier une question', async () => {
		await c.stagiaireA.from('questions').update({ enonce: 'piraté' }).eq('id', q.validee.id);
		const { data } = await admin.from('questions').select('enonce').eq('id', q.validee.id).single();
		expect(data!.enonce).not.toBe('piraté');
	});

	test('un compte désactivé ne lit plus rien', async () => {
		await admin.from('profils').update({ actif: false }).eq('id', c.ids.stagiaireB);
		const { data } = await c.stagiaireB.from('questions').select('id').eq('id', q.validee.id);
		expect(data).toEqual([]);
		await admin.from('profils').update({ actif: true }).eq('id', c.ids.stagiaireB);
	});
});

describe('règles d’accès : formateur', () => {
	test('voit les séances pédagogiques de A, pas ses examens d’entraînement', async () => {
		const { data } = await c.formateur.from('seances').select('id').eq('stagiaire_id', c.ids.stagiaireA);
		expect(ids(data)).toEqual([seancePedagoA]);
	});

	test('voit les réponses pédagogiques de A, pas celles de son examen d’entraînement', async () => {
		const { data } = await c.formateur.from('reponses').select('seance_id').in('seance_id', [seancePedagoA, seanceExamenA]);
		expect((data ?? []).map((r) => r.seance_id)).toEqual([seancePedagoA]);
	});

	test('crée, modifie et valide une question ; lit les bonnes réponses', async () => {
		const ins = await c.formateur.from('questions').insert({ enonce: 'Par un formateur', explication: 'x' }).select('id').single();
		expect(ins.error).toBeNull();
		const maj = await c.formateur.from('questions').update({ statut: 'validee' }).eq('id', ins.data!.id).select('statut').single();
		expect(maj.data?.statut).toBe('validee');
		expect((await c.formateur.from('bonnes_reponses').select('question_id').eq('question_id', q.validee.id)).data).toHaveLength(1);
		await admin.from('questions').delete().eq('id', ins.data!.id);
	});

	test('voit tous les profils et peut désactiver un stagiaire', async () => {
		const { data } = await c.formateur.from('profils').select('id').in('id', [c.ids.stagiaireA, c.ids.stagiaireB]);
		expect(data).toHaveLength(2);
		const r = await c.formateur.from('profils').update({ actif: false }).eq('id', c.ids.stagiaireB).select('actif').single();
		expect(r.data?.actif).toBe(false);
		await admin.from('profils').update({ actif: true }).eq('id', c.ids.stagiaireB);
	});
});

describe('règles d’accès : visiteur non connecté', () => {
	test('ne lit ni questions, ni règles, ni profils', async () => {
		const anonyme = nouveauClientAnonyme();
		for (const table of ['questions', 'regles', 'profils', 'themes']) {
			const { data } = await anonyme.from(table).select('id').limit(1);
			expect(data ?? [], table).toEqual([]);
		}
	});
});
