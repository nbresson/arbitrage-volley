import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { creerComptesDeTest, creerExamen, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin } from './client';

let c: ComptesDeTest;
let autres: ComptesDeTest; // autres.stagiaireA = C, jamais inscrit
const q: Awaited<ReturnType<typeof creerQuestion>>[] = [];
let brouillon = '';
let examen = '';
let code = '';
let tentativeA = '';
let tentativeB = '';

beforeAll(async () => {
	[c, autres] = await Promise.all([creerComptesDeTest(), creerComptesDeTest()]);
	for (let i = 0; i < 3; i++) q.push(await creerQuestion({ usage: 'reserve_examen' }));
	brouillon = await creerExamen(c.formateur);
	await c.formateur.from('inscriptions').insert({ examen_id: brouillon, stagiaire_id: c.ids.stagiaireA });
	examen = await creerExamen(c.formateur, { duree: 30, seuil: 1 });
	await c.formateur.rpc('composer_examen', { p_examen: examen, p_question_ids: q.map((x) => x.id) });
	await c.formateur.from('inscriptions').insert([
		{ examen_id: examen, stagiaire_id: c.ids.stagiaireA },
		{ examen_id: examen, stagiaire_id: c.ids.stagiaireB }
	]);
	const { data } = await c.formateur.rpc('ouvrir_examen', { p_examen: examen });
	code = data as string;
}, 90000);

afterAll(async () => {
	await admin.from('tentatives').delete().in('examen_id', [examen, brouillon]);
	await admin.from('examens_officiels').delete().in('id', [examen, brouillon]);
	await admin.from('questions').delete().in('id', q.map((x) => x.id));
	await Promise.all([c.nettoyer(), autres.nettoyer()]);
});

const repondre = (client = c.stagiaireA, tentative = tentativeA, i = 0, lettre = 'B', quand?: Date) =>
	client.rpc('repondre_tentative', {
		p_tentative: tentative,
		p_question: q[i].id,
		p_lettre: lettre,
		...(quand ? { p_repondu_le: quand.toISOString() } : {})
	});

const avecEspaces = (code: string) => ` ${code.slice(0, 2)} ${code.slice(2, 4)}-${code.slice(4)} `;

describe('convocations', () => {
	test('le stagiaire inscrit voit l’examen, sans le code', async () => {
		const { data, error } = await c.stagiaireA.rpc('mes_convocations');
		expect(error).toBeNull();
		const ligne = data!.find((l: any) => l.examen_id === examen);
		expect(ligne).toMatchObject({ nb_questions: 3, statut: 'ouvert', duree_minutes: 30, tentative_id: null, terminee: false, formateur: 'Test formateur' });
		expect(Object.keys(ligne)).not.toContain('code');
		expect(Object.values(ligne)).not.toContain(code);
	});

	test('un stagiaire non inscrit n’a pas de convocation', async () => {
		const { data } = await autres.stagiaireA.rpc('mes_convocations');
		expect(data).toEqual([]);
	});
});

describe('commencer', () => {
	test('non inscrit : refusé', async () => {
		const { error } = await autres.stagiaireA.rpc('commencer_tentative', { p_examen: examen, p_code: code });
		expect(error?.message).toBe('Vous n’êtes pas inscrit à cet examen.');
	});

	test('examen en brouillon : refusé', async () => {
		const { error } = await c.stagiaireA.rpc('commencer_tentative', { p_examen: brouillon, p_code: '000000' });
		expect(error?.message).toBe('L’examen n’est pas encore ouvert.');
	});

	test('mauvais code : refusé', async () => {
		const faux = code === '000000' ? '111111' : '000000';
		const { error } = await c.stagiaireA.rpc('commencer_tentative', { p_examen: examen, p_code: faux });
		expect(error?.message).toBe('Code d’accès incorrect.');
	});

	test('bon code saisi avec espaces et tiret : accepté', async () => {
		const { data, error } = await c.stagiaireA.rpc('commencer_tentative', { p_examen: examen, p_code: avecEspaces(code) });
		expect(error).toBeNull();
		tentativeA = data as string;
		expect(tentativeA).toMatch(/^[0-9a-f-]{36}$/);
	});

	test('reprise : même tentative, chronomètre inchangé', async () => {
		const { data: avant } = await c.stagiaireA.rpc('info_tentative', { p_tentative: tentativeA });
		const { data } = await c.stagiaireA.rpc('commencer_tentative', { p_examen: examen, p_code: code });
		expect(data).toBe(tentativeA);
		const { data: apres } = await c.stagiaireA.rpc('info_tentative', { p_tentative: tentativeA });
		expect(apres[0].debut).toBe(avant[0].debut);
		expect(apres[0]).toMatchObject({ examen_id: examen, duree_minutes: 30, nb_questions: 3, fin: null });
	});
});

describe('répondre', () => {
	test('les questions viennent de la copie figée, sans la bonne réponse', async () => {
		const { data, error } = await c.stagiaireA.rpc('questions_de_tentative', { p_tentative: tentativeA });
		expect(error).toBeNull();
		expect(data).toHaveLength(3);
		expect(data[0].propositions).toEqual(['A', 'B', 'C', 'D'].map((lettre) => ({ lettre, texte: `Réponse ${lettre}` })));
		expect(JSON.stringify(data)).not.toMatch(/bonne/);
	});

	test('un autre stagiaire ne lit pas la tentative', async () => {
		const { error } = await c.stagiaireB.rpc('questions_de_tentative', { p_tentative: tentativeA });
		expect(error?.code).toBe('42501');
	});

	test('la table des questions reste fermée pendant la tentative', async () => {
		const { data } = await c.stagiaireA.from('questions').select('id').in('id', q.map((x) => x.id));
		expect(data).toEqual([]);
	});

	test('répondre deux fois : une seule réponse, la dernière', async () => {
		expect((await repondre(c.stagiaireA, tentativeA, 0, 'A')).data).toEqual({ enregistree: true });
		expect((await repondre(c.stagiaireA, tentativeA, 0, 'B')).error).toBeNull();
		const { data } = await c.stagiaireA.rpc('questions_de_tentative', { p_tentative: tentativeA });
		expect(data[0].lettre_choisie).toBe('B');
	});

	test('une réponse plus ancienne n’écrase pas une plus récente', async () => {
		await repondre(c.stagiaireA, tentativeA, 1, 'A', new Date());
		await repondre(c.stagiaireA, tentativeA, 1, 'C', new Date(Date.now() - 60_000));
		const { data } = await c.stagiaireA.rpc('questions_de_tentative', { p_tentative: tentativeA });
		expect(data[1].lettre_choisie).toBe('A');
	});

	test('réponse datée après la durée : refusée', async () => {
		const { error } = await repondre(c.stagiaireA, tentativeA, 2, 'B', new Date(Date.now() + 31 * 60_000));
		expect(error?.message).toBe('Le temps de l’examen est écoulé.');
	});

	test('signaler une question', async () => {
		const { error } = await c.stagiaireA.rpc('signaler_tentative', { p_tentative: tentativeA, p_question: q[2].id, p_signalee: true });
		expect(error).toBeNull();
		const { data } = await c.stagiaireA.rpc('questions_de_tentative', { p_tentative: tentativeA });
		expect(data[2]).toMatchObject({ signalee: true, lettre_choisie: null });
	});
});

describe('terminer', () => {
	test('bilan calculé sur la copie figée, sans correction', async () => {
		const { data, error } = await c.stagiaireA.rpc('terminer_tentative', { p_tentative: tentativeA });
		expect(error).toBeNull();
		expect(data).toMatchObject({ score: 1, total: 3, seuil: 1, reussi: true });
		expect(JSON.stringify(data)).not.toMatch(/bonne|lettre/);
	});

	test('idempotent', async () => {
		const { data } = await c.stagiaireA.rpc('terminer_tentative', { p_tentative: tentativeA });
		expect(data).toMatchObject({ score: 1, total: 3 });
	});

	test('après la fin, les questions ne sont plus lisibles', async () => {
		const { error } = await c.stagiaireA.rpc('questions_de_tentative', { p_tentative: tentativeA });
		expect(error?.message).toBe('Votre examen est terminé.');
	});

	test('après la fin, répondre est refusé', async () => {
		const { error } = await repondre(c.stagiaireA, tentativeA, 2, 'B');
		expect(error?.message).toBe('Votre examen est terminé.');
	});
});

describe('clôture pendant une tentative', () => {
	test('les réponses arrivées après la clôture sont refusées', async () => {
		const { data } = await c.stagiaireB.rpc('commencer_tentative', { p_examen: examen, p_code: code });
		tentativeB = data as string;
		expect((await repondre(c.stagiaireB, tentativeB, 0, 'B')).error).toBeNull();
		expect((await c.formateur.rpc('clore_examen', { p_examen: examen })).error).toBeNull();
		const { error } = await repondre(c.stagiaireB, tentativeB, 1, 'B');
		expect(error?.message).toBe('Cet examen est clos.');
	});

	test('le bilan ne compte que la réponse arrivée avant', async () => {
		const { data } = await c.stagiaireB.rpc('terminer_tentative', { p_tentative: tentativeB });
		expect(data).toMatchObject({ score: 1, total: 3 });
	});

	test('commencer après la clôture : refusé', async () => {
		const { error } = await c.stagiaireA.rpc('commencer_tentative', { p_examen: examen, p_code: code });
		expect(error?.message).toBe('Cet examen est clos.');
	});

	test('la convocation reste visible avec la tentative terminée', async () => {
		const { data } = await c.stagiaireB.rpc('mes_convocations');
		expect(data!.find((l: any) => l.examen_id === examen)).toMatchObject({ statut: 'clos', tentative_id: tentativeB, terminee: true });
	});
});
