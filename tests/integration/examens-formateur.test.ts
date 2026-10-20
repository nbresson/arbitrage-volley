import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { creerComptesDeTest, creerExamen, creerQuestion, type ComptesDeTest } from './aide-comptes';
import { admin } from './client';

let c: ComptesDeTest;
let autres: ComptesDeTest; // fournit le stagiaire C (inscrit, jamais venu)
let regleId = '';
const q: Record<string, Awaited<ReturnType<typeof creerQuestion>>> = {};
const examens: string[] = [];
let examen = '';

const nouvelExamen = async (options?: { seuil?: number }) => {
	const id = await creerExamen(c.formateur, options);
	examens.push(id);
	return id;
};

/** Données complètes attendues par enregistrer_question (V1). */
const donnees = (enonce: string, bonne: 'A' | 'B' | 'C' | 'D', usage: 'entrainement' | 'reserve_examen') => ({
	enonce,
	explication: 'Explication modifiée',
	themeId: '',
	niveauId: '',
	roleCible: 'arbitre',
	usage,
	videoUrl: '',
	propositions: ['A', 'B', 'C', 'D'].map((lettre) => ({ lettre, texte: `Réponse ${lettre}` })),
	bonne,
	regles: [{ id: regleId, principale: true }]
});

beforeAll(async () => {
	[c, autres] = await Promise.all([creerComptesDeTest(), creerComptesDeTest()]);
	const { data: regle } = await admin.from('regles').select('id').limit(1).single();
	regleId = regle!.id;
	for (const nom of ['q1', 'q2', 'q3']) q[nom] = await creerQuestion({ usage: 'reserve_examen' });
	q.entrainement = await creerQuestion();
	q.brouillon = await creerQuestion({ usage: 'reserve_examen', statut: 'brouillon' });
	await admin.from('question_regles').insert(['q1', 'q2', 'q3'].map((n) => ({ question_id: q[n].id, regle_id: regleId, principale: true })));
	examen = await nouvelExamen();
}, 90000);

afterAll(async () => {
	await admin.from('tentatives').delete().in('examen_id', examens);
	await admin.from('examens_officiels').delete().in('id', examens);
	await admin.from('questions').delete().in('id', Object.values(q).map((x) => x.id));
	await Promise.all([c.nettoyer(), autres.nettoyer()]);
});

describe('fonctions réservées aux formateurs', () => {
	test.each([
		['composer_examen', () => ({ p_examen: examen, p_question_ids: [] })],
		['ouvrir_examen', () => ({ p_examen: examen })],
		['clore_examen', () => ({ p_examen: examen })],
		['resultats_examen', () => ({ p_examen: examen })],
		['detail_tentative', () => ({ p_tentative: examen })]
	])('%s refusée à un stagiaire', async (fn, args) => {
		const { error } = await c.stagiaireA.rpc(fn, args());
		expect(error?.code).toBe('42501');
	});
});

describe('composer un examen', () => {
	test('refuse une question d’entraînement', async () => {
		const { error } = await c.formateur.rpc('composer_examen', { p_examen: examen, p_question_ids: [q.entrainement.id] });
		expect(error?.message).toBe('Seules les questions validées de la réserve d’examen peuvent être ajoutées.');
	});

	test('refuse un brouillon de la réserve', async () => {
		const { error } = await c.formateur.rpc('composer_examen', { p_examen: examen, p_question_ids: [q.brouillon.id] });
		expect(error?.message).toBe('Seules les questions validées de la réserve d’examen peuvent être ajoutées.');
	});

	test('range les questions dans l’ordre donné', async () => {
		const { data, error } = await c.formateur.rpc('composer_examen', { p_examen: examen, p_question_ids: [q.q3.id, q.q1.id, q.q2.id] });
		expect(error).toBeNull();
		expect(data).toBe(3);
		const { data: lignes } = await c.formateur.from('examen_questions').select('question_id, ordre').eq('examen_id', examen).order('ordre');
		expect(lignes!.map((l) => l.question_id)).toEqual([q.q3.id, q.q1.id, q.q2.id]);
	});
});

describe('ouvrir un examen', () => {
	test('sans question : refusé', async () => {
		const vide = await nouvelExamen();
		const { error } = await c.formateur.rpc('ouvrir_examen', { p_examen: vide });
		expect(error?.message).toBe('Ajoutez au moins une question.');
	});

	test('sans inscrit : refusé', async () => {
		const { error } = await c.formateur.rpc('ouvrir_examen', { p_examen: examen });
		expect(error?.message).toBe('Inscrivez au moins un stagiaire.');
	});

	test('seuil supérieur au nombre de questions : refusé', async () => {
		const trop = await nouvelExamen({ seuil: 5 });
		await c.formateur.rpc('composer_examen', { p_examen: trop, p_question_ids: [q.q1.id, q.q3.id] });
		await c.formateur.from('inscriptions').insert({ examen_id: trop, stagiaire_id: c.ids.stagiaireA });
		const { error } = await c.formateur.rpc('ouvrir_examen', { p_examen: trop });
		expect(error?.message).toBe('Le seuil dépasse le nombre de questions.');
	});

	test('une question repassée en brouillon après la composition : ouverture refusée', async () => {
		q.devenueBrouillon = await creerQuestion({ usage: 'reserve_examen' });
		const ex = await nouvelExamen();
		await c.formateur.rpc('composer_examen', { p_examen: ex, p_question_ids: [q.devenueBrouillon.id] });
		await c.formateur.from('inscriptions').insert({ examen_id: ex, stagiaire_id: c.ids.stagiaireA });
		await admin.from('questions').update({ statut: 'brouillon' }).eq('id', q.devenueBrouillon.id);
		const { error } = await c.formateur.rpc('ouvrir_examen', { p_examen: ex });
		expect(error?.message).toBe('Une question de l’examen n’est plus validée dans la réserve d’examen : retirez-la ou validez-la.');
	});

	test('renvoie un code de 6 chiffres, le même au second appel', async () => {
		const { error: e } = await c.formateur.from('inscriptions').insert([
			{ examen_id: examen, stagiaire_id: c.ids.stagiaireA },
			{ examen_id: examen, stagiaire_id: c.ids.stagiaireB },
			{ examen_id: examen, stagiaire_id: autres.ids.stagiaireA }
		]);
		expect(e).toBeNull();
		const { data: code, error } = await c.formateur.rpc('ouvrir_examen', { p_examen: examen });
		expect(error).toBeNull();
		expect(code).toMatch(/^[0-9]{6}$/);
		const { data: lu } = await c.formateur.from('examen_codes').select('code').eq('examen_id', examen).single();
		expect(lu!.code).toBe(code);
		const { data: encore } = await c.formateur.rpc('ouvrir_examen', { p_examen: examen });
		expect(encore).toBe(code);
	});

	test('ne compose plus un examen ouvert', async () => {
		const { error } = await c.formateur.rpc('composer_examen', { p_examen: examen, p_question_ids: [q.q1.id] });
		expect(error?.message).toBe('Cet examen est déjà ouvert.');
	});

	test('copie figée : modifier puis archiver la question ne change pas l’examen', async () => {
		const { data: avant } = await c.formateur.from('examen_questions').select('enonce, bonne_lettre, propositions, regles, theme').eq('examen_id', examen).eq('question_id', q.q1.id).single();
		expect(avant!.bonne_lettre).toBe('B');
		expect(avant!.propositions).toHaveLength(4);
		expect(avant!.regles[0]).toMatchObject({ principale: true });
		const { error } = await c.formateur.rpc('enregistrer_question', { p_id: q.q1.id, p_donnees: donnees('Énoncé réécrit', 'C', 'reserve_examen'), p_valider: true });
		expect(error).toBeNull();
		await c.formateur.from('questions').update({ statut: 'archivee' }).eq('id', q.q1.id);
		const { data: apres } = await c.formateur.from('examen_questions').select('enonce, bonne_lettre').eq('examen_id', examen).eq('question_id', q.q1.id).single();
		expect(apres).toEqual({ enonce: avant!.enonce, bonne_lettre: 'B' });
	});

	test('bascule vers l’entraînement refusée tant que l’examen n’est pas clos', async () => {
		const { error } = await c.formateur.rpc('enregistrer_question', { p_id: q.q2.id, p_donnees: donnees('Q2', 'B', 'entrainement'), p_valider: true });
		expect(error?.message).toBe('Cette question fait partie d’un examen officiel qui n’est pas clos.');
	});
});

describe('clore un examen et lire les résultats', () => {
	let tentativeB = '';

	beforeAll(async () => {
		const { data: t } = await admin
			.from('tentatives')
			.insert([
				{ examen_id: examen, stagiaire_id: c.ids.stagiaireA, fin: new Date().toISOString(), score: 3, total: 3, reussi: true },
				{ examen_id: examen, stagiaire_id: c.ids.stagiaireB }
			])
			.select('id, stagiaire_id');
		tentativeB = t!.find((x) => x.stagiaire_id === c.ids.stagiaireB)!.id;
		// B : une bonne réponse (B, figée) à q1, une fausse à q3, rien à q2.
		await admin.from('tentative_reponses').insert([
			{ tentative_id: tentativeB, question_id: q.q1.id, lettre: 'B' },
			{ tentative_id: tentativeB, question_id: q.q3.id, lettre: 'D' }
		]);
	});

	test('avant la clôture : B en cours, C absent', async () => {
		const { data } = await c.formateur.rpc('resultats_examen', { p_examen: examen });
		const etat = Object.fromEntries(data!.map((l: any) => [l.stagiaire_id, l.etat]));
		expect(etat).toEqual({ [c.ids.stagiaireA]: 'termine', [c.ids.stagiaireB]: 'en_cours', [autres.ids.stagiaireA]: 'absent' });
	});

	test('le détail d’une tentative en cours est refusé', async () => {
		const { error } = await c.formateur.rpc('detail_tentative', { p_tentative: tentativeB });
		expect(error?.message).toBe('L’examen de ce stagiaire n’est pas terminé.');
	});

	test('la clôture termine B avec les réponses arrivées', async () => {
		const { error } = await c.formateur.rpc('clore_examen', { p_examen: examen });
		expect(error).toBeNull();
		const { data } = await c.formateur.rpc('resultats_examen', { p_examen: examen });
		const b = data!.find((l: any) => l.stagiaire_id === c.ids.stagiaireB);
		expect(b).toMatchObject({ etat: 'termine', score: 1, total: 3, reussi: true, tentative_id: tentativeB });
		expect(data!.find((l: any) => l.stagiaire_id === autres.ids.stagiaireA)).toMatchObject({ etat: 'absent', tentative_id: null });
	});

	test('une seconde clôture ne change rien', async () => {
		const { data: avant } = await admin.from('tentatives').select('fin, score').eq('id', tentativeB).single();
		const { error } = await c.formateur.rpc('clore_examen', { p_examen: examen });
		expect(error).toBeNull();
		const { data: apres } = await admin.from('tentatives').select('fin, score').eq('id', tentativeB).single();
		expect(apres).toEqual(avant);
	});

	test('détail de B : une case juste, règles manquées comptées', async () => {
		const { data, error } = await c.formateur.rpc('detail_tentative', { p_tentative: tentativeB });
		expect(error).toBeNull();
		expect(data.questions.map((x: any) => x.juste)).toEqual([false, true, false]); // ordre : q3, q1, q2
		expect(data.questions[2].lettre).toBeNull();
		expect(data).toMatchObject({ score: 1, total: 3, seuil: 1, reussi: true });
		expect(data.regles).toHaveLength(1);
		expect(data.regles[0].erreurs).toBe(2);
	});

	test('après la clôture, la bascule vers l’entraînement est acceptée', async () => {
		const { error } = await c.formateur.rpc('enregistrer_question', { p_id: q.q2.id, p_donnees: donnees('Q2', 'B', 'entrainement'), p_valider: true });
		expect(error).toBeNull();
	});

	test('finaliser_tentative n’est pas appelable directement', async () => {
		const { error } = await c.formateur.rpc('finaliser_tentative', { p_tentative: tentativeB });
		expect(error).not.toBeNull();
	});
});
