import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { creerComptesDeTest, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin, unique } from './client';

let c: ComptesDeTest;
let themeId = '';
let autreThemeId = '';
let regleId = '';
let editionId = '';
const qs: Awaited<ReturnType<typeof creerQuestion>>[] = [];
let reserve: Awaited<ReturnType<typeof creerQuestion>>;
let brouillon: Awaited<ReturnType<typeof creerQuestion>>;

beforeAll(async () => {
	c = await creerComptesDeTest();
	const t = await admin.from('themes').insert([{ libelle: `Thème test ${unique()}`, ordre: 900 }, { libelle: `Autre thème ${unique()}`, ordre: 901 }]).select('id');
	[themeId, autreThemeId] = t.data!.map((x) => x.id);
	const ed = await admin.from('editions').insert({ source: 'fivb_regles', libelle: `Édition test ${unique()}` }).select('id').single();
	editionId = ed.data!.id;
	const r = await admin.from('regles').insert({ edition_id: editionId, reference: '19.3.1.4', texte: 'Texte de la règle', ordre: 1 }).select('id').single();
	regleId = r.data!.id;
	for (let i = 0; i < 3; i++) qs.push(await creerQuestion({ themeId }));
	await admin.from('question_regles').insert(qs.map((q, i) => ({ question_id: q.id, regle_id: regleId, principale: i === 0 })));
	await admin.from('questions').update({ role_cible: 'marqueur' }).eq('id', qs[2].id);
	reserve = await creerQuestion({ themeId, usage: 'reserve_examen' });
	brouillon = await creerQuestion({ themeId, statut: 'brouillon' });
	await creerQuestion({ themeId: autreThemeId });
}, 60000);

afterAll(async () => {
	await admin.from('questions').delete().in('theme_id', [themeId, autreThemeId]);
	await admin.from('themes').delete().in('id', [themeId, autreThemeId]);
	await admin.from('editions').delete().eq('id', editionId);
	await c.nettoyer();
});

const creer = (client = c.stagiaireA, p: Record<string, unknown> = {}) =>
	client.rpc('creer_seance', {
		p_type: 'pedagogique',
		p_theme_ids: [themeId],
		p_regle_id: null,
		p_niveau_id: null,
		p_role: null,
		p_nb: 10,
		p_duree_minutes: null,
		...p
	});

describe('creer_seance', () => {
	test('tire seulement les questions validées d’entraînement du thème', async () => {
		const { data: id, error } = await creer();
		expect(error).toBeNull();
		const { data } = await c.stagiaireA.rpc('questions_de_seance', { p_seance: id });
		expect(new Set(data.map((q: { question_id: string }) => q.question_id))).toEqual(new Set(qs.map((q) => q.id)));
		expect(data.map((q: { question_id: string }) => q.question_id)).not.toContain(reserve.id);
		expect(data.map((q: { question_id: string }) => q.question_id)).not.toContain(brouillon.id);
	});

	test('le rôle « arbitre » écarte les questions réservées aux marqueurs', async () => {
		const { data: id } = await creer(c.stagiaireA, { p_role: 'arbitre' });
		const { data } = await c.stagiaireA.rpc('questions_de_seance', { p_seance: id });
		expect(data.map((q: { question_id: string }) => q.question_id)).not.toContain(qs[2].id);
	});

	test('filtre par règle', async () => {
		const { data: id } = await creer(c.stagiaireA, { p_theme_ids: null, p_regle_id: regleId });
		const { data } = await c.stagiaireA.rpc('questions_de_seance', { p_seance: id });
		expect(new Set(data.map((q: { question_id: string }) => q.question_id))).toEqual(new Set(qs.map((q) => q.id)));
	});

	test('aucune question : message clair', async () => {
		const { error } = await creer(c.stagiaireA, { p_theme_ids: [themeId], p_role: 'arbitre', p_regle_id: '00000000-0000-0000-0000-000000000000' });
		expect(error?.message).toBe('Aucune question ne correspond à ces critères.');
	});

	test('les propositions sont renvoyées sans la bonne réponse', async () => {
		const { data: id } = await creer();
		const { data } = await c.stagiaireA.rpc('questions_de_seance', { p_seance: id });
		expect(JSON.stringify(data)).not.toMatch(/correcte"\s*:\s*true|bonne/);
		expect(data[0].propositions).toHaveLength(4);
		expect(Object.keys(data[0].propositions[0]).sort()).toEqual(['id', 'lettre', 'texte']);
	});
});

describe('valider_reponse en mode pédagogique', () => {
	test('réponse fausse : correction, bonne proposition et source principale', async () => {
		const { data: id } = await creer();
		const { data: r, error } = await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: qs[0].props.A });
		expect(error).toBeNull();
		expect(r).toMatchObject({ correcte: false, bonne_proposition_id: qs[0].props.B, explication: 'Explication de test' });
		expect(r.sources[0]).toMatchObject({ reference: '19.3.1.4', principale: true, source: 'fivb_regles' });
	});

	test('double appel : même résultat, une seule réponse enregistrée ; la première réponse fait foi', async () => {
		const { data: id } = await creer();
		const args = { p_seance: id, p_question: qs[1].id, p_proposition: qs[1].props.B };
		const [r1, r2] = await Promise.all([c.stagiaireA.rpc('valider_reponse', args), c.stagiaireA.rpc('valider_reponse', args)]);
		expect(r1.data).toEqual(r2.data);
		const r3 = await c.stagiaireA.rpc('valider_reponse', { ...args, p_proposition: qs[1].props.C });
		expect(r3.data.correcte).toBe(true);
		const { count } = await admin.from('reponses').select('*', { count: 'exact', head: true }).eq('seance_id', id);
		expect(count).toBe(1);
	});

	test('un autre stagiaire ne peut pas répondre dans la séance de A', async () => {
		const { data: id } = await creer();
		const { error } = await c.stagiaireB.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: qs[0].props.B });
		expect(error).not.toBeNull();
	});

	test('une proposition d’une autre question est refusée', async () => {
		const { data: id } = await creer();
		const { error } = await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: qs[1].props.B });
		expect(error).not.toBeNull();
	});
});

describe('examen d’entraînement', () => {
	test('la réponse est enregistrée sans aucune indication de correction', async () => {
		const { data: id } = await creer(c.stagiaireA, { p_type: 'examen_entrainement', p_duree_minutes: 30 });
		const { data } = await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: qs[0].props.B });
		expect(data).toEqual({ enregistree: true });
		const { data: lignes } = await c.stagiaireA.from('reponses').select('correcte').eq('seance_id', id);
		expect(lignes).toEqual([{ correcte: null }]);
	});

	test('la réponse peut être changée tant que l’examen n’est pas terminé', async () => {
		const { data: id } = await creer(c.stagiaireA, { p_type: 'examen_entrainement', p_duree_minutes: 30 });
		await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: qs[0].props.A });
		await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: qs[0].props.B });
		const { data } = await c.stagiaireA.rpc('terminer_seance', { p_seance: id });
		expect(data.score).toBe(1);
	});

	test('réponse donnée après la durée : refusée', async () => {
		const { data: id } = await creer(c.stagiaireA, { p_type: 'examen_entrainement', p_duree_minutes: 5 });
		const tard = new Date(Date.now() + 10 * 60_000).toISOString();
		const { error } = await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: qs[0].props.B, p_repondu_le: tard });
		expect(error?.message).toBe('Le temps de l’examen est écoulé.');
	});

	test('terminer deux fois donne le même bilan ; plus de réponse ensuite', async () => {
		const { data: id } = await creer(c.stagiaireA, { p_type: 'examen_entrainement', p_duree_minutes: 30 });
		await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: qs[0].props.B });
		await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[1].id, p_proposition: qs[1].props.A });
		const b1 = await c.stagiaireA.rpc('terminer_seance', { p_seance: id });
		const b2 = await c.stagiaireA.rpc('terminer_seance', { p_seance: id });
		expect(b1.data).toEqual(b2.data);
		expect(b1.data).toMatchObject({ score: 1, total: 3 });
		expect(b1.data.par_theme[0]).toMatchObject({ theme_id: themeId, justes: 1, total: 3 });
		const { error } = await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[2].id, p_proposition: qs[2].props.B });
		expect(error?.message).toBe('Cette séance est terminée.');
	});

	test('signaler une question à vérifier, puis la retrouver dans la séance', async () => {
		const { data: id } = await creer(c.stagiaireA, { p_type: 'examen_entrainement', p_duree_minutes: 30 });
		await c.stagiaireA.rpc('signaler_question', { p_seance: id, p_question: qs[1].id, p_signalee: true });
		const { data } = await c.stagiaireA.rpc('questions_de_seance', { p_seance: id });
		expect(data.find((q: { question_id: string }) => q.question_id === qs[1].id)).toMatchObject({ signalee: true, proposition_choisie: null });
	});
});

describe('avancement', () => {
	test('acquise = dernière réponse juste ; à revoir = dernière fausse', async () => {
		const s1 = (await creer(c.stagiaireB)).data;
		await c.stagiaireB.rpc('valider_reponse', { p_seance: s1, p_question: qs[0].id, p_proposition: qs[0].props.A });
		await c.stagiaireB.rpc('valider_reponse', { p_seance: s1, p_question: qs[1].id, p_proposition: qs[1].props.A });
		const s2 = (await creer(c.stagiaireB)).data;
		await c.stagiaireB.rpc('valider_reponse', { p_seance: s2, p_question: qs[0].id, p_proposition: qs[0].props.B });
		const { data } = await c.stagiaireB.rpc('avancement');
		expect(data.find((a: { theme_id: string }) => a.theme_id === themeId)).toMatchObject({ total: 3, acquises: 1, a_revoir: 1 });
	});

	test('le formateur voit l’avancement d’un stagiaire ; un autre stagiaire non', async () => {
		expect((await c.formateur.rpc('avancement', { p_stagiaire: c.ids.stagiaireB })).error).toBeNull();
		expect((await c.stagiaireA.rpc('avancement', { p_stagiaire: c.ids.stagiaireB })).error).not.toBeNull();
	});

	test('filtré par rôle : seules les questions du rôle (ou des deux) comptent', async () => {
		// qs[2] est réservée aux marqueurs : pour un arbitre, le thème n’a que 2 questions.
		const { data, error } = await c.stagiaireB.rpc('avancement', { p_role: 'arbitre' });
		expect(error).toBeNull();
		expect(data.find((a: { theme_id: string }) => a.theme_id === themeId)).toMatchObject({ total: 2 });
		const { data: m } = await c.stagiaireB.rpc('avancement', { p_role: 'marqueur' });
		expect(m.find((a: { theme_id: string }) => a.theme_id === themeId)).toMatchObject({ total: 1 });
	});

	test('les examens d’entraînement ne comptent pas dans l’avancement', async () => {
		const avant = (await c.stagiaireA.rpc('avancement')).data.find((a: { theme_id: string }) => a.theme_id === autreThemeId);
		expect(avant).toMatchObject({ acquises: 0, a_revoir: 0 });
	});
});

describe('enregistrer_question', () => {
	const donnees = () => ({
		enonce: 'Nouvelle question',
		explication: 'Pourquoi',
		propositions: (['A', 'B', 'C', 'D'] as const).map((lettre) => ({ lettre, texte: `P${lettre}` })),
		bonne: 'C',
		themeId,
		niveauId: null,
		roleCible: 'arbitre',
		usage: 'entrainement',
		videoUrl: null,
		regles: [{ id: regleId, principale: true }]
	});

	test('le formateur crée puis valide une question complète', async () => {
		const { data: id, error } = await c.formateur.rpc('enregistrer_question', { p_id: null, p_donnees: donnees(), p_valider: false });
		expect(error).toBeNull();
		const q = await admin.from('questions').select('statut, auteur_id').eq('id', id).single();
		expect(q.data).toMatchObject({ statut: 'brouillon', auteur_id: c.ids.formateur });
		await c.formateur.rpc('enregistrer_question', { p_id: id, p_donnees: { ...donnees(), bonne: 'D' }, p_valider: true });
		const v = await admin.from('questions').select('statut, valide_par, propositions(lettre, id), bonnes_reponses(proposition_id)').eq('id', id).single();
		expect(v.data!.statut).toBe('validee');
		expect(v.data!.valide_par).toBe(c.ids.formateur);
		const d = (v.data!.propositions as { lettre: string; id: string }[]).find((p) => p.lettre === 'D')!.id;
		expect((v.data!.bonnes_reponses as unknown as { proposition_id: string }).proposition_id ?? (v.data!.bonnes_reponses as { proposition_id: string }[])[0].proposition_id).toBe(d);
	});

	test('un stagiaire ne peut pas enregistrer de question', async () => {
		const { error } = await c.stagiaireA.rpc('enregistrer_question', { p_id: null, p_donnees: donnees(), p_valider: true });
		expect(error).not.toBeNull();
	});
});

describe('corrections de la revue finale', () => {
	test('examen : une réponse plus ancienne arrivée en retard n’écrase pas la plus récente', async () => {
		const { data: id } = await creer(c.stagiaireA, { p_type: 'examen_entrainement', p_duree_minutes: 30 });
		const recent = new Date().toISOString();
		const ancien = new Date(Date.now() - 60_000).toISOString();
		await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: qs[0].props.B, p_repondu_le: recent });
		await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: qs[0].props.A, p_repondu_le: ancien });
		const { data } = await c.stagiaireA.rpc('terminer_seance', { p_seance: id });
		expect(data.score).toBe(1);
	});

	test('examen : après la fin du temps (et du délai de renvoi), une réponse antidatée est refusée', async () => {
		const { data: id } = await creer(c.stagiaireA, { p_type: 'examen_entrainement', p_duree_minutes: 5 });
		await admin.from('seances').update({ debut: new Date(Date.now() - 60 * 60_000).toISOString() }).eq('id', id);
		const antidate = new Date(Date.now() - 58 * 60_000).toISOString(); // « dans le temps » selon l'appareil
		const { error } = await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: qs[0].props.B, p_repondu_le: antidate });
		expect(error?.message).toBe('Le temps de l’examen est écoulé.');
	});

	test('examen : une réponse gardée hors ligne, renvoyée peu après la fin, est acceptée', async () => {
		const { data: id } = await creer(c.stagiaireA, { p_type: 'examen_entrainement', p_duree_minutes: 5 });
		await admin.from('seances').update({ debut: new Date(Date.now() - 8 * 60_000).toISOString() }).eq('id', id);
		const pendant = new Date(Date.now() - 4 * 60_000).toISOString();
		const { error } = await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[0].id, p_proposition: qs[0].props.B, p_repondu_le: pendant });
		expect(error).toBeNull();
	});

	test('les fonctions internes ne sont pas appelables par un stagiaire', async () => {
		expect((await c.stagiaireA.rpc('sources_question', { p_question: reserve.id })).error).not.toBeNull();
		expect((await c.stagiaireA.rpc('ma_seance', { p_seance: '00000000-0000-0000-0000-000000000000' })).error?.code).toBe('42501');
	});

	test('pédagogique : la réponse renvoie la proposition réellement enregistrée', async () => {
		const { data: id } = await creer();
		await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[2].id, p_proposition: qs[2].props.A });
		const { data } = await c.stagiaireA.rpc('valider_reponse', { p_seance: id, p_question: qs[2].id, p_proposition: qs[2].props.B });
		expect(data).toMatchObject({ proposition_id: qs[2].props.A, correcte: false });
	});

	test('un formateur ne peut pas désactiver son propre compte', async () => {
		await c.formateur.from('profils').update({ actif: false }).eq('id', c.ids.formateur);
		const { data } = await admin.from('profils').select('actif').eq('id', c.ids.formateur).single();
		expect(data!.actif).toBe(true);
	});
});
