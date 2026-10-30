// Courbes des stagiaires : les 5 dernières séances de CHAQUE stagiaire, sans plafond global.
import { afterAll, beforeAll, expect, test } from 'vitest';
import { creerComptesDeTest, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin, unique } from './client';

let c: ComptesDeTest;
let themeId = '';
let q: Awaited<ReturnType<typeof creerQuestion>>;

beforeAll(async () => {
	c = await creerComptesDeTest();
	themeId = (await admin.from('themes').insert({ libelle: `Thème dernières ${unique()}`, ordre: 966 }).select('id').single()).data!.id;
	q = await creerQuestion({ themeId });
	for (let i = 0; i < 7; i++) {
		const debut = new Date(Date.now() - (7 - i) * 3_600_000).toISOString();
		const { data: s } = await admin.from('seances').insert({ stagiaire_id: c.ids.stagiaireA, type: 'pedagogique', nb_questions: 1, debut }).select('id').single();
		await admin.from('reponses').insert({ seance_id: s!.id, question_id: q.id, correcte: i % 2 === 0 });
	}
	// Séance sans réponse corrigée : ignorée.
	await admin.from('seances').insert({ stagiaire_id: c.ids.stagiaireA, type: 'pedagogique', nb_questions: 1 });
}, 90000);

afterAll(async () => {
	await admin.from('questions').delete().eq('theme_id', themeId);
	await admin.from('themes').delete().eq('id', themeId);
	await c.nettoyer();
});

test('au plus 5 séances par stagiaire, les plus récentes, sans plafond global', async () => {
	const { data, error } = await c.formateur.rpc('dernieres_seances', { p_n: 5 });
	expect(error).toBeNull();
	const a = data.filter((l: { stagiaire_id: string }) => l.stagiaire_id === c.ids.stagiaireA);
	expect(a).toHaveLength(5);
	expect(a.every((l: { total: number }) => l.total === 1)).toBe(true);
	const plusAncienne = Math.min(...a.map((l: { debut: string }) => new Date(l.debut).getTime()));
	expect(Date.now() - plusAncienne).toBeLessThan(5.5 * 3_600_000);
});

test('stagiaire : 42501', async () => {
	expect((await c.stagiaireA.rpc('dernieres_seances', { p_n: 5 })).error?.code).toBe('42501');
});
