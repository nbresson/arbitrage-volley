import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { BrouillonQuestion, CasImport, CasSansQuestion, RegleImport } from '../../src/lib/domain/types';
import { charger } from '../../scripts/import/charger';
import { admin, unique } from './client';

const id = unique();
const editions = { regles: `Règles test ${id}`, casebook: `Casebook test ${id}` };
const theme = `Thème chargeur ${id}`;

const regle = (reference: string, parent: string | null, ordre: number): RegleImport => ({
	reference,
	parent_reference: parent,
	titre: null,
	texte: `Texte ${reference}`,
	renvois: [],
	ordre
});
const cas = (reference: string, ordre: number): CasImport => ({
	reference,
	chapitre: 'Actions de jeu',
	rubrique: theme,
	mention_2025: null,
	video_url: null,
	situation: `Situation ${reference}`,
	decision: `Décision ${reference}`,
	regles_citees: ['19.3.1.4'],
	texte_original: `Original ${reference}`,
	ordre
});
const brouillon = (c: string, regles: string[]): BrouillonQuestion => ({
	cas: c,
	enonce: `Énoncé ${c}`,
	propositions: (['A', 'B', 'C', 'D'] as const).map((lettre) => ({ lettre, texte: `P${lettre}`, correcte: lettre === 'C' })),
	explication: `Explication ${c}`,
	theme,
	niveau: 'Niveau 2',
	role_cible: 'arbitre',
	regles,
	regle_principale: regles[0]
});

const jeu = () => ({
	regles: [regle('19', null, 0), regle('19.3', '19', 1), regle('19.3.1.4', '19.3', 2)],
	cas: [cas('Cas 3.35.1', 0), cas('Cas 3.36', 1)],
	brouillons: [
		brouillon('Cas 3.35.1', ['19.3.1.4', 'Fig.1b', '99.9', 'Cas 3.35.1']),
		{ cas: 'Cas 3.36', sans_question: true, raison: 'ouverte' } as CasSansQuestion
	]
});

// Le chargeur désactive les autres éditions d'une source : on restaure l'état de la base de dev ensuite.
let activesAvant: string[] = [];
beforeAll(async () => {
	const { data } = await admin.from('editions').select('id').eq('active', true);
	activesAvant = (data ?? []).map((e) => e.id);
});

afterAll(async () => {
	if (activesAvant.length) await admin.from('editions').update({ active: true }).in('id', activesAvant);
	const { data: t } = await admin.from('themes').select('id').eq('libelle', theme);
	if (t?.length) await admin.from('questions').delete().eq('theme_id', t[0].id);
	await admin.from('themes').delete().eq('libelle', theme);
	await admin.from('editions').delete().like('libelle', `%${id}%`);
});

describe('charger', () => {
	test('premier chargement : comptes, brouillons et liens', async () => {
		const r = await charger(admin, jeu(), editions);
		expect(r).toMatchObject({ regles: 3, cas: 2, questions: 1 });
		expect(r.liensIgnores.sort()).toEqual(['Cas 3.35.1 → 99.9', 'Cas 3.35.1 → Fig.1b']);

		const { data: q } = await admin
			.from('questions')
			.select('statut, origine, enonce, origine_regle_id, question_regles(principale, regles(reference)), bonnes_reponses(proposition_id), propositions(id, lettre)')
			.eq('enonce', 'Énoncé Cas 3.35.1');
		expect(q).toHaveLength(1);
		expect(q![0]).toMatchObject({ statut: 'brouillon', origine: 'casebook' });
		const liens = (q![0].question_regles as unknown as { principale: boolean; regles: { reference: string } }[]).map((l) => [l.regles.reference, l.principale]);
		expect(liens.sort()).toEqual([['19.3.1.4', true], ['Cas 3.35.1', false]]);
		const c = (q![0].propositions as { id: string; lettre: string }[]).find((p) => p.lettre === 'C')!.id;
		const bonne = q![0].bonnes_reponses as unknown as { proposition_id: string } | { proposition_id: string }[];
		expect(Array.isArray(bonne) ? bonne[0].proposition_id : bonne.proposition_id).toBe(c);

		const { data: casRegle } = await admin.from('regles').select('id, texte, renvois, rubrique').eq('reference', 'Cas 3.35.1').like('texte', '%Cas 3.35.1%');
		expect(casRegle![0].texte).toBe('Situation : Situation Cas 3.35.1\n\nDécision : Décision Cas 3.35.1');
		expect(q![0].origine_regle_id).toBe(casRegle![0].id);
	});

	test('second chargement : mêmes comptes en base, question validée non écrasée', async () => {
		await admin.from('questions').update({ statut: 'validee', enonce: 'Corrigée par un formateur' }).eq('enonce', 'Énoncé Cas 3.35.1');
		await charger(admin, jeu(), editions);
		const { data: ed } = await admin.from('editions').select('id').in('libelle', Object.values(editions));
		const { count: nbRegles } = await admin.from('regles').select('*', { count: 'exact', head: true }).in('edition_id', ed!.map((e) => e.id));
		expect(nbRegles).toBe(5);
		const { data: t } = await admin.from('themes').select('id').eq('libelle', theme).single();
		const { data: q } = await admin.from('questions').select('enonce, statut').eq('theme_id', t!.id);
		expect(q).toEqual([{ enonce: 'Corrigée par un formateur', statut: 'validee' }]);
	});

	test('nouvelle édition du Casebook : ancienne désactivée, questions validées à relire', async () => {
		const suivante = { ...editions, casebook: `Casebook test suivant ${id}` };
		await charger(admin, jeu(), suivante);
		const { data: anc } = await admin.from('editions').select('active').eq('libelle', editions.casebook).single();
		expect(anc!.active).toBe(false);
		const { data: q } = await admin.from('questions').select('a_relire').eq('enonce', 'Corrigée par un formateur').single();
		expect(q!.a_relire).toBe(true);
		// pas de doublon : le cas a déjà une question (validée), aucun nouveau brouillon n'est créé
		const { count } = await admin.from('questions').select('*', { count: 'exact', head: true }).eq('enonce', 'Énoncé Cas 3.35.1');
		expect(count).toBe(0);
	});
});
