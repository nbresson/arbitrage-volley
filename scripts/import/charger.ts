// Charge en base les règles, les cas du Casebook et les brouillons de questions. Idempotent.
// Utilisation : npx tsx scripts/import/charger.ts --cible dev|prod [--edition-regles "…"] [--edition-casebook "…"]
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import type { BrouillonQuestion, CasImport, EntreeBrouillon, RegleImport } from '../../src/lib/domain/types';

export type Fichiers = { regles: RegleImport[]; cas: CasImport[]; brouillons: EntreeBrouillon[] };
export type Editions = { regles: string; casebook: string };
export const EDITIONS_PAR_DEFAUT: Editions = { regles: 'Règles officielles 2025-2028', casebook: 'Casebook 2025' };

const verifier = <T>(r: { data: T; error: unknown }): T => {
	if (r.error) throw r.error;
	return r.data;
};

/** Crée l'édition si besoin, l'active, et désactive les autres éditions de la même source. */
async function activerEdition(db: SupabaseClient, source: 'fivb_regles' | 'casebook', libelle: string): Promise<{ id: string; anciennes: string[] }> {
	verifier(await db.from('editions').upsert({ source, libelle, active: true }, { onConflict: 'libelle' }));
	const toutes = verifier(await db.from('editions').select('id, libelle, active').eq('source', source)) as { id: string; libelle: string; active: boolean }[];
	const id = toutes.find((e) => e.libelle === libelle)!.id;
	const anciennes = toutes.filter((e) => e.id !== id && e.active).map((e) => e.id);
	if (anciennes.length) verifier(await db.from('editions').update({ active: false }).in('id', anciennes));
	return { id, anciennes };
}

/** Les questions validées liées à une règle d'une édition remplacée sont signalées « à relire ». */
async function signalerARelire(db: SupabaseClient, editionsRemplacees: string[]) {
	if (!editionsRemplacees.length) return;
	const regles = verifier(await db.from('regles').select('id').in('edition_id', editionsRemplacees)) as { id: string }[];
	const ids = regles.map((r) => r.id);
	for (let i = 0; i < ids.length; i += 200) {
		const liens = verifier(await db.from('question_regles').select('question_id').in('regle_id', ids.slice(i, i + 200))) as { question_id: string }[];
		const questions = [...new Set(liens.map((l) => l.question_id))];
		if (questions.length) verifier(await db.from('questions').update({ a_relire: true }).eq('statut', 'validee').in('id', questions));
	}
}

async function idsParLibelle(db: SupabaseClient, table: 'themes' | 'niveaux', libelles: string[]) {
	const existants = verifier(await db.from(table).select('id, libelle, ordre')) as { id: string; libelle: string; ordre: number }[];
	const manquants = [...new Set(libelles)].filter((l) => !existants.some((e) => e.libelle === l));
	let ordre = Math.max(0, ...existants.map((e) => e.ordre));
	if (manquants.length) {
		const crees = verifier(await db.from(table).insert(manquants.map((libelle) => ({ libelle, ordre: ++ordre }))).select('id, libelle, ordre'));
		existants.push(...(crees as typeof existants));
	}
	return new Map(existants.map((e) => [e.libelle, e.id]));
}

export async function charger(db: SupabaseClient, f: Fichiers, editions: Editions = EDITIONS_PAR_DEFAUT) {
	const edRegles = await activerEdition(db, 'fivb_regles', editions.regles);
	const edCas = await activerEdition(db, 'casebook', editions.casebook);

	// Règles FIVB
	const lignesRegles = f.regles.map((r) => ({
		edition_id: edRegles.id,
		reference: r.reference,
		parent_reference: r.parent_reference,
		titre: r.titre,
		texte: r.texte,
		renvois: r.renvois,
		ordre: r.ordre
	}));
	for (let i = 0; i < lignesRegles.length; i += 500) {
		verifier(await db.from('regles').upsert(lignesRegles.slice(i, i + 500), { onConflict: 'edition_id,reference' }));
	}

	// Cas du Casebook (règles citables de l'édition Casebook)
	const lignesCas = f.cas.map((c) => ({
		edition_id: edCas.id,
		reference: c.reference,
		parent_reference: null,
		titre: null,
		texte: `Situation : ${c.situation}\n\nDécision : ${c.decision}`,
		texte_original: c.texte_original,
		renvois: c.regles_citees,
		video_url: c.video_url,
		chapitre: c.chapitre,
		rubrique: c.rubrique,
		ordre: c.ordre
	}));
	verifier(await db.from('regles').upsert(lignesCas, { onConflict: 'edition_id,reference' }));

	const idsRegles = new Map(
		(verifier(await db.from('regles').select('id, reference').eq('edition_id', edRegles.id)) as { id: string; reference: string }[]).map((r) => [r.reference, r.id])
	);
	const idsCas = new Map(
		(verifier(await db.from('regles').select('id, reference').eq('edition_id', edCas.id)) as { id: string; reference: string }[]).map((r) => [r.reference, r.id])
	);

	await signalerARelire(db, [...edRegles.anciennes, ...edCas.anciennes]);

	// Brouillons de questions
	const brouillons = f.brouillons.filter((b): b is BrouillonQuestion => !('sans_question' in b));
	const themes = await idsParLibelle(db, 'themes', brouillons.map((b) => b.theme));
	const niveaux = await idsParLibelle(db, 'niveaux', brouillons.map((b) => b.niveau));
	const liensIgnores: string[] = [];
	let questions = 0;

	// Questions déjà issues d'un cas, quelle que soit l'édition (évite les doublons d'une édition à l'autre)
	const existantes = verifier(
		await db.from('questions').select('id, statut, cas:regles!questions_origine_regle_id_fkey(reference)').eq('origine', 'casebook')
	) as unknown as { id: string; statut: string; cas: { reference: string } | null }[];
	const parCas = new Map(existantes.filter((q) => q.cas).map((q) => [q.cas!.reference, q]));

	for (const b of brouillons) {
		const casId = idsCas.get(b.cas);
		if (!casId) {
			liensIgnores.push(`${b.cas} → cas absent`);
			continue;
		}
		const deja = parCas.get(b.cas);
		if (deja && deja.statut !== 'brouillon') continue; // relue par un formateur : on n'y touche pas

		const champs = {
			enonce: b.enonce,
			explication: b.explication,
			theme_id: themes.get(b.theme) ?? null,
			niveau_id: niveaux.get(b.niveau) ?? null,
			role_cible: b.role_cible,
			usage: 'entrainement',
			statut: 'brouillon',
			origine: 'casebook',
			origine_regle_id: casId
		};
		const questionId = deja
			? (verifier(await db.from('questions').update(champs).eq('id', deja.id)), deja.id)
			: ((verifier(await db.from('questions').insert(champs).select('id').single()) as { id: string }).id);
		questions++;

		const props = verifier(
			await db
				.from('propositions')
				.upsert(b.propositions.map((p) => ({ question_id: questionId, lettre: p.lettre, texte: p.texte })), { onConflict: 'question_id,lettre' })
				.select('id, lettre')
		) as { id: string; lettre: string }[];
		const bonne = props.find((p) => p.lettre === b.propositions.find((x) => x.correcte)!.lettre)!;
		verifier(await db.from('bonnes_reponses').upsert({ question_id: questionId, proposition_id: bonne.id }, { onConflict: 'question_id' }));

		const liens: { question_id: string; regle_id: string; principale: boolean }[] = [];
		for (const ref of b.regles) {
			const regleId = ref.startsWith('Cas ') ? idsCas.get(ref) : idsRegles.get(ref);
			if (!regleId) {
				liensIgnores.push(`${b.cas} → ${ref}`);
				continue;
			}
			if (!liens.some((l) => l.regle_id === regleId)) liens.push({ question_id: questionId, regle_id: regleId, principale: ref === b.regle_principale });
		}
		verifier(await db.from('question_regles').delete().eq('question_id', questionId));
		if (liens.length) verifier(await db.from('question_regles').insert(liens));
	}

	return { regles: lignesRegles.length, cas: lignesCas.length, questions, liensIgnores };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	config({ path: '.env.local', quiet: true });
	const arg = (nom: string) => {
		const i = process.argv.indexOf(nom);
		return i > 0 ? process.argv[i + 1] : undefined;
	};
	const cible = arg('--cible') === 'prod' ? 'prod' : 'dev';
	const url = cible === 'prod' ? process.env.SUPABASE_PROD_URL : process.env.SUPABASE_TEST_URL;
	const cle = cible === 'prod' ? process.env.SUPABASE_PROD_SERVICE_KEY : process.env.SUPABASE_TEST_SERVICE_KEY;
	if (!url || !cle) {
		console.error(`URL ou clé service absente pour la cible « ${cible} » dans .env.local`);
		process.exit(1);
	}
	const lire = <T>(fichier: string): T => JSON.parse(readFileSync(fichier, 'utf8'));
	const db = createClient(url, cle, { auth: { persistSession: false } });
	const r = await charger(
		db,
		{
			regles: lire('data/regles-2025-2028.json'),
			cas: lire('data/casebook-2025.json'),
			brouillons: lire('data/brouillons-casebook-2025.json')
		},
		{ regles: arg('--edition-regles') ?? EDITIONS_PAR_DEFAUT.regles, casebook: arg('--edition-casebook') ?? EDITIONS_PAR_DEFAUT.casebook }
	);
	console.log(`${cible} : ${r.regles} règles, ${r.cas} cas, ${r.questions} questions (brouillons créés ou mis à jour).`);
	if (r.liensIgnores.length) console.log(`Liens non créés (${r.liensIgnores.length}) : ${r.liensIgnores.join(' ; ')}`);
}
