// Lot D : sorties d'écran enregistrées, date et lieu dans l'info de tentative, suivi en direct côté formateur.
import { afterAll, beforeAll, expect, test } from 'vitest';
import { creerComptesDeTest, creerExamen, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin } from './client';

let c: ComptesDeTest;
const q: Awaited<ReturnType<typeof creerQuestion>>[] = [];
let examen = '';
let tentative = '';

beforeAll(async () => {
	c = await creerComptesDeTest();
	for (let i = 0; i < 3; i++) q.push(await creerQuestion({ usage: 'reserve_examen' }));
	examen = await creerExamen(c.formateur, { duree: 30, seuil: 1 });
	await c.formateur.rpc('composer_examen', { p_examen: examen, p_question_ids: q.map((x) => x.id) });
	await c.formateur.from('inscriptions').insert([
		{ examen_id: examen, stagiaire_id: c.ids.stagiaireA },
		{ examen_id: examen, stagiaire_id: c.ids.stagiaireB }
	]);
	const { data: code } = await c.formateur.rpc('ouvrir_examen', { p_examen: examen });
	const { data, error } = await c.stagiaireA.rpc('commencer_tentative', { p_examen: examen, p_code: code });
	if (error) throw error;
	tentative = data;
	await c.stagiaireA.rpc('repondre_tentative', { p_tentative: tentative, p_question: q[0].id, p_lettre: 'B' });
	await c.stagiaireA.rpc('repondre_tentative', { p_tentative: tentative, p_question: q[1].id, p_lettre: 'A' });
}, 90000);

afterAll(async () => {
	await admin.from('tentatives').delete().eq('examen_id', examen);
	await admin.from('examens_officiels').delete().eq('id', examen);
	await admin.from('questions').delete().in('id', q.map((x) => x.id));
	await c.nettoyer();
});

test('chaque sortie d’écran pendant l’examen est comptée', async () => {
	expect((await c.stagiaireA.rpc('noter_sortie', { p_tentative: tentative })).data).toBe(1);
	expect((await c.stagiaireA.rpc('noter_sortie', { p_tentative: tentative })).data).toBe(2);
});

test('un autre stagiaire ne peut pas noter une sortie sur cette tentative', async () => {
	const { error } = await c.stagiaireB.rpc('noter_sortie', { p_tentative: tentative });
	expect(error?.code).toBe('42501');
});

test('l’info de tentative donne la date et le lieu de l’examen', async () => {
	const { data, error } = await c.stagiaireA.rpc('info_tentative', { p_tentative: tentative });
	expect(error).toBeNull();
	expect(data[0]).toMatchObject({ lieu: 'Salle de test' });
	expect(new Date(data[0].date_heure).getTime()).toBeGreaterThan(Date.now());
});

test('suivi en direct : début, réponses données et sorties pour chaque inscrit', async () => {
	const { data, error } = await c.formateur.rpc('resultats_examen', { p_examen: examen });
	expect(error).toBeNull();
	const a = data.find((r: { stagiaire_id: string }) => r.stagiaire_id === c.ids.stagiaireA);
	const b = data.find((r: { stagiaire_id: string }) => r.stagiaire_id === c.ids.stagiaireB);
	expect(a).toMatchObject({ etat: 'en_cours', repondues: 2, sorties: 2, nb_questions: 3 });
	expect(a.debut).not.toBeNull();
	expect(b).toMatchObject({ etat: 'absent', repondues: 0, sorties: 0, debut: null });
});

test('après la fin, une sortie n’est plus comptée', async () => {
	await c.stagiaireA.rpc('terminer_tentative', { p_tentative: tentative });
	expect((await c.stagiaireA.rpc('noter_sortie', { p_tentative: tentative })).data).toBe(2);
});

test('le stagiaire ne lit pas les résultats de la salle', async () => {
	const { error } = await c.stagiaireA.rpc('resultats_examen', { p_examen: examen });
	expect(error?.code).toBe('42501');
});
