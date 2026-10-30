// Lot C : rejouer un examen blanc terminé, avec la correction (séance pédagogique, même ordre)
// ou comme nouvel examen (mêmes questions, nouvel ordre, même durée).
import { afterAll, beforeAll, expect, test } from 'vitest';
import { creerComptesDeTest, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin, unique } from './client';

let c: ComptesDeTest;
let themeId = '';
let examen = '';
const qs: Awaited<ReturnType<typeof creerQuestion>>[] = [];
const ids = (data: { question_id: string }[]) => data.map((q) => q.question_id);

beforeAll(async () => {
	c = await creerComptesDeTest();
	const t = await admin.from('themes').insert({ libelle: `Thème rejouer ${unique()}`, ordre: 961 }).select('id').single();
	themeId = t.data!.id;
	for (let i = 0; i < 5; i++) qs.push(await creerQuestion({ themeId }));
	const { data, error } = await c.stagiaireA.rpc('creer_seance', {
		p_type: 'examen_entrainement',
		p_theme_ids: [themeId],
		p_regle_id: null,
		p_niveau_id: null,
		p_role: null,
		p_nb: 5,
		p_duree_minutes: 12
	});
	if (error) throw error;
	examen = data;
}, 60000);

afterAll(async () => {
	await admin.from('questions').delete().eq('theme_id', themeId);
	await admin.from('themes').delete().eq('id', themeId);
	await c.nettoyer();
});

test('un examen en cours ne peut pas être revu avec la correction', async () => {
	const { error } = await c.stagiaireA.rpc('rejouer_examen', { p_seance: examen, p_avec_correction: true });
	expect(error?.message).toBe('Terminez l’examen avant de le rejouer.');
});

test('avec la correction : séance pédagogique, mêmes questions dans le même ordre', async () => {
	await c.stagiaireA.rpc('terminer_seance', { p_seance: examen });
	const { data: avant } = await c.stagiaireA.rpc('questions_de_seance', { p_seance: examen });
	const { data: id, error } = await c.stagiaireA.rpc('rejouer_examen', { p_seance: examen, p_avec_correction: true });
	expect(error).toBeNull();
	const { data: apres } = await c.stagiaireA.rpc('questions_de_seance', { p_seance: id });
	expect(ids(apres)).toEqual(ids(avant));
	const { data: s } = await c.stagiaireA.from('seances').select('type, nb_questions, duree_minutes, fin, filtre').eq('id', id).single();
	expect(s).toEqual({ type: 'pedagogique', nb_questions: 5, duree_minutes: null, fin: null, filtre: { reprise_de: examen } });
});

test('comme nouvel examen : mêmes questions, même durée, pas encore commencé', async () => {
	const { data: id, error } = await c.stagiaireA.rpc('rejouer_examen', { p_seance: examen, p_avec_correction: false });
	expect(error).toBeNull();
	const { data: apres } = await c.stagiaireA.rpc('questions_de_seance', { p_seance: id });
	expect(new Set(ids(apres))).toEqual(new Set(qs.map((q) => q.id)));
	const { data: s } = await c.stagiaireA.from('seances').select('type, nb_questions, duree_minutes, fin').eq('id', id).single();
	expect(s).toEqual({ type: 'examen_entrainement', nb_questions: 5, duree_minutes: 12, fin: null });
});

test('une question retirée de l’entraînement depuis n’est plus reprise', async () => {
	await admin.from('questions').update({ statut: 'brouillon' }).eq('id', qs[0].id);
	const { data: id } = await c.stagiaireA.rpc('rejouer_examen', { p_seance: examen, p_avec_correction: true });
	const { data } = await c.stagiaireA.rpc('questions_de_seance', { p_seance: id });
	expect(ids(data)).not.toContain(qs[0].id);
	expect(data).toHaveLength(4);
	await admin.from('questions').update({ statut: 'validee' }).eq('id', qs[0].id);
});

test('un autre stagiaire ne peut pas rejouer cet examen', async () => {
	const { error } = await c.stagiaireB.rpc('rejouer_examen', { p_seance: examen, p_avec_correction: true });
	expect(error?.code).toBe('42501');
});

test('seul un examen blanc se rejoue', async () => {
	const { data: peda } = await c.stagiaireA.rpc('creer_seance', {
		p_type: 'pedagogique',
		p_theme_ids: [themeId],
		p_regle_id: null,
		p_niveau_id: null,
		p_role: null,
		p_nb: 5,
		p_duree_minutes: null
	});
	const { error } = await c.stagiaireA.rpc('rejouer_examen', { p_seance: peda, p_avec_correction: false });
	expect(error?.message).toBe('Seul un examen blanc peut être rejoué.');
});
