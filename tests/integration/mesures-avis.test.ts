// Lot J : mesures d'usage agrégées, avis après l'examen officiel.
import { afterAll, beforeAll, expect, test } from 'vitest';
import { creerComptesDeTest, creerExamen, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin, unique } from './client';

let c: ComptesDeTest;
let themeId = '';
const q: Awaited<ReturnType<typeof creerQuestion>>[] = [];
let examen = '';
let tentative = '';

beforeAll(async () => {
	c = await creerComptesDeTest();
	themeId = (await admin.from('themes').insert({ libelle: `Thème mesures ${unique()}`, ordre: 963 }).select('id').single()).data!.id;
	q.push(await creerQuestion({ themeId }), await creerQuestion({ usage: 'reserve_examen' }));
	const { data: s } = await c.stagiaireA.rpc('creer_seance', { p_type: 'pedagogique', p_theme_ids: [themeId], p_regle_id: null, p_niveau_id: null, p_role: null, p_nb: 5, p_duree_minutes: null });
	await c.stagiaireA.rpc('valider_reponse', { p_seance: s, p_question: q[0].id, p_proposition: q[0].props.B });
	examen = await creerExamen(c.formateur, { duree: 30, seuil: 1 });
	await c.formateur.rpc('composer_examen', { p_examen: examen, p_question_ids: [q[1].id] });
	await c.formateur.from('inscriptions').insert({ examen_id: examen, stagiaire_id: c.ids.stagiaireA });
	const { data: code } = await c.formateur.rpc('ouvrir_examen', { p_examen: examen });
	tentative = (await c.stagiaireA.rpc('commencer_tentative', { p_examen: examen, p_code: code })).data;
}, 90000);

afterAll(async () => {
	await admin.from('tentatives').delete().eq('examen_id', examen);
	await admin.from('examens_officiels').delete().eq('id', examen);
	await admin.from('questions').delete().in('id', q.map((x) => x.id));
	await admin.from('themes').delete().eq('id', themeId);
	await c.nettoyer();
});

test('mesures : totaux du jour et par thème, réservés aux formateurs', async () => {
	const { data: jours, error } = await c.formateur.rpc('mesures_jours', { p_jours: 7 });
	expect(error).toBeNull();
	const aujourdhui = jours.at(-1);
	expect(aujourdhui.seances).toBeGreaterThanOrEqual(1);
	expect(aujourdhui.reponses).toBeGreaterThanOrEqual(1);
	expect(Object.keys(aujourdhui).sort()).toEqual(['jour', 'reponses', 'seances', 'stagiaires']);
	const { data: themes } = await c.formateur.rpc('mesures_themes', { p_jours: 7 });
	expect(themes.find((t: { theme: string }) => t.theme.startsWith('Thème mesures'))).toMatchObject({ reponses: 1, justes: 1 });
	expect((await c.stagiaireA.rpc('mesures_jours', { p_jours: 7 })).error?.code).toBe('42501');
});

test('avis : seulement après la fin de l’examen, modifiable, lu sans nom par les formateurs', async () => {
	const avant = await c.stagiaireA.rpc('donner_avis', { p_tentative: tentative, p_note: 4, p_commentaire: 'Bien' });
	expect(avant.error?.message).toBe('Donnez votre avis une fois l’examen terminé.');
	await c.stagiaireA.rpc('terminer_tentative', { p_tentative: tentative });
	expect((await c.stagiaireA.rpc('donner_avis', { p_tentative: tentative, p_note: 4, p_commentaire: 'Bien' })).error).toBeNull();
	expect((await c.stagiaireA.rpc('donner_avis', { p_tentative: tentative, p_note: 5, p_commentaire: '  ' })).error).toBeNull();
	expect((await c.stagiaireA.rpc('mon_avis', { p_tentative: tentative })).data).toEqual([{ note: 5, commentaire: null }]);
	const { data } = await c.formateur.rpc('avis_de_l_examen', { p_examen: examen });
	expect(data.map((a: { note: number }) => a.note)).toEqual([5]);
	expect(Object.keys(data[0])).not.toContain('stagiaire_id');
	expect((await c.stagiaireB.rpc('donner_avis', { p_tentative: tentative, p_note: 1, p_commentaire: null })).error?.code).toBe('42501');
	expect((await c.stagiaireA.from('avis_examen').select('note')).data).toEqual([]);
});
