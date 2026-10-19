import { afterAll, describe, expect, test } from 'vitest';
import { admin, unique } from './client';

const crees: { questions: string[]; seances: string[]; users: string[] } = { questions: [], seances: [], users: [] };

afterAll(async () => {
	if (crees.seances.length) await admin.from('seances').delete().in('id', crees.seances);
	if (crees.questions.length) await admin.from('questions').delete().in('id', crees.questions);
	for (const u of crees.users) await admin.auth.admin.deleteUser(u);
});

async function questionAvecPropositions() {
	const { data: q, error } = await admin.from('questions').insert({ enonce: `Test ${unique()}`, explication: 'x' }).select('id').single();
	if (error) throw error;
	crees.questions.push(q.id);
	const { data: props, error: e2 } = await admin
		.from('propositions')
		.insert(['A', 'B', 'C', 'D'].map((lettre) => ({ question_id: q.id, lettre, texte: lettre })))
		.select('id, lettre');
	if (e2) throw e2;
	return { questionId: q.id as string, props: props as { id: string; lettre: string }[] };
}

describe('schéma V1', () => {
	test('une question, ses 4 propositions et sa bonne réponse s’enregistrent', async () => {
		const { questionId, props } = await questionAvecPropositions();
		const { error } = await admin.from('bonnes_reponses').insert({ question_id: questionId, proposition_id: props[1].id });
		expect(error).toBeNull();
	});

	test('les propositions ne portent pas la bonne réponse (table séparée)', async () => {
		const { data, error } = await admin.from('propositions').select('*').limit(1);
		expect(error).toBeNull();
		expect(Object.keys(data?.[0] ?? { id: 1 })).not.toContain('correcte');
	});

	test('un statut inconnu est refusé (23514)', async () => {
		const { error } = await admin.from('questions').insert({ enonce: 'x', statut: 'publiee' });
		expect(error?.code).toBe('23514');
	});

	test('une seule réponse par question et par séance (23505)', async () => {
		const { data: u } = await admin.auth.admin.createUser({ email: `schema-${unique()}@test.invalid`, password: `Mdp-${unique()}-1`, email_confirm: true });
		crees.users.push(u.user!.id);
		await admin.from('profils').insert({ id: u.user!.id, prenom: 'T', nom: 'Schéma' });
		const { questionId, props } = await questionAvecPropositions();
		const { data: s, error: es } = await admin
			.from('seances')
			.insert({ stagiaire_id: u.user!.id, type: 'pedagogique', nb_questions: 1 })
			.select('id')
			.single();
		expect(es).toBeNull();
		crees.seances.push(s!.id);
		const ligne = { seance_id: s!.id, question_id: questionId, proposition_id: props[0].id, correcte: false };
		expect((await admin.from('reponses').insert(ligne)).error).toBeNull();
		expect((await admin.from('reponses').insert(ligne)).error?.code).toBe('23505');
	});

	test('le référentiel de départ est chargé', async () => {
		const { data: ed } = await admin.from('editions').select('libelle, source, active');
		expect(ed).toEqual(
			expect.arrayContaining([
				{ libelle: 'Règles officielles 2025-2028', source: 'fivb_regles', active: true },
				{ libelle: 'Casebook 2025', source: 'casebook', active: true }
			])
		);
		const { data: niv } = await admin.from('niveaux').select('libelle').order('ordre');
		expect(niv?.map((n) => n.libelle)).toEqual(['Niveau 1', 'Niveau 2', 'Niveau 3']);
		const { count } = await admin.from('themes').select('*', { count: 'exact', head: true });
		expect(count).toBe(22);
	});
});
