// Courbes de réussite de la liste des stagiaires : ce que le formateur peut lire, et ce qu'un stagiaire ne peut pas lire.
import { afterAll, beforeAll, expect, test } from 'vitest';
import { courbesReussite, type SeanceReponses } from '../../src/lib/formateur/courbes';
import { creerComptesDeTest, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin, unique } from './client';

let c: ComptesDeTest;
let themeId = '';
const qs: Awaited<ReturnType<typeof creerQuestion>>[] = [];

const lire = (client = c.formateur) =>
	client.from('seances').select('stagiaire_id, debut, reponses(correcte)').eq('type', 'pedagogique').order('debut', { ascending: false });

beforeAll(async () => {
	c = await creerComptesDeTest();
	const t = await admin.from('themes').insert({ libelle: `Thème courbes ${unique()}`, ordre: 950 }).select('id').single();
	themeId = t.data!.id;
	for (let i = 0; i < 4; i++) qs.push(await creerQuestion({ themeId }));
	const { data: seance, error } = await c.stagiaireA.rpc('creer_seance', {
		p_type: 'pedagogique',
		p_theme_ids: [themeId],
		p_regle_id: null,
		p_niveau_id: null,
		p_role: null,
		p_nb: 4,
		p_duree_minutes: null
	});
	if (error) throw error;
	await admin.from('reponses').insert(qs.map((q, i) => ({ seance_id: seance, question_id: q.id, correcte: i < 3 })));
}, 60000);

afterAll(async () => {
	await admin.from('questions').delete().eq('theme_id', themeId);
	await admin.from('themes').delete().eq('id', themeId);
	await c.nettoyer();
});

test('le formateur lit les séances pédagogiques et leurs réponses : 3 justes sur 4', async () => {
	const { data, error } = await lire();
	expect(error).toBeNull();
	expect(courbesReussite(data as SeanceReponses[]).get(c.ids.stagiaireA)).toEqual([75]);
});

test('un stagiaire ne voit pas les séances d’un autre', async () => {
	const { data } = await lire(c.stagiaireB);
	expect((data ?? []).some((s) => s.stagiaire_id === c.ids.stagiaireA)).toBe(false);
});
