// Lot G : promotion, dernière activité, statistiques par question d'un examen.
import { afterAll, beforeAll, expect, test } from 'vitest';
import { creerComptesDeTest, creerExamen, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin } from './client';

let c: ComptesDeTest;
const q: Awaited<ReturnType<typeof creerQuestion>>[] = [];
let examen = '';

beforeAll(async () => {
	c = await creerComptesDeTest();
	for (let i = 0; i < 2; i++) q.push(await creerQuestion({ usage: 'reserve_examen' }));
	examen = await creerExamen(c.formateur, { duree: 30, seuil: 1 });
	await c.formateur.rpc('composer_examen', { p_examen: examen, p_question_ids: q.map((x) => x.id) });
	await c.formateur.from('inscriptions').insert([
		{ examen_id: examen, stagiaire_id: c.ids.stagiaireA },
		{ examen_id: examen, stagiaire_id: c.ids.stagiaireB }
	]);
	const { data: code } = await c.formateur.rpc('ouvrir_examen', { p_examen: examen });
	for (const [client, lettre] of [[c.stagiaireA, 'B'], [c.stagiaireB, 'A']] as const) {
		const { data: t } = await client.rpc('commencer_tentative', { p_examen: examen, p_code: code });
		await client.rpc('repondre_tentative', { p_tentative: t, p_question: q[0].id, p_lettre: lettre });
		await client.rpc('terminer_tentative', { p_tentative: t });
	}
}, 90000);

afterAll(async () => {
	await admin.from('tentatives').delete().eq('examen_id', examen);
	await admin.from('examens_officiels').delete().eq('id', examen);
	await admin.from('questions').delete().in('id', q.map((x) => x.id));
	await c.nettoyer();
});

test('promotion : posée par un formateur, jamais par le stagiaire lui-même', async () => {
	expect((await c.formateur.from('profils').update({ promotion: 'Session automne 2026' }).eq('id', c.ids.stagiaireA)).error).toBeNull();
	const { error } = await c.stagiaireA.from('profils').update({ promotion: 'Autre' }).eq('id', c.ids.stagiaireA);
	expect(error?.code).toBe('42501');
	const { data } = await admin.from('profils').select('promotion').eq('id', c.ids.stagiaireA).single();
	expect(data!.promotion).toBe('Session automne 2026');
});

test('dernière activité : visible des formateurs seulement, examens officiels compris', async () => {
	const { data, error } = await c.formateur.rpc('activite_stagiaires');
	expect(error).toBeNull();
	const a = data.find((l: { stagiaire_id: string }) => l.stagiaire_id === c.ids.stagiaireA);
	expect(Date.now() - new Date(a.derniere).getTime()).toBeLessThan(10 * 60_000);
	expect((await c.stagiaireA.rpc('activite_stagiaires')).error?.code).toBe('42501');
});

test('statistiques par question : répondants, justes, sans réponse', async () => {
	const { data, error } = await c.formateur.rpc('stats_examen', { p_examen: examen });
	expect(error).toBeNull();
	expect(data.map((l: any) => [l.ordre, l.repondants, l.justes, l.sans_reponse])).toEqual([
		[1, 2, 1, 0],
		[2, 2, 0, 2]
	]);
	expect((await c.stagiaireA.rpc('stats_examen', { p_examen: examen })).error?.code).toBe('42501');
});
