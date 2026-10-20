// Crée des comptes de test (formateur, deux stagiaires) et des clients connectés avec ces comptes.
import type { SupabaseClient } from '@supabase/supabase-js';
import { admin, nouveauClientAnonyme, unique } from './client';

export type ComptesDeTest = {
	formateur: SupabaseClient;
	stagiaireA: SupabaseClient;
	stagiaireB: SupabaseClient;
	ids: { formateur: string; stagiaireA: string; stagiaireB: string };
	nettoyer: () => Promise<void>;
};

async function creerCompte(role: 'formateur' | 'stagiaire', nom: string) {
	const email = `${nom}-${unique()}@test.invalid`;
	const password = `Mdp-${unique()}-${unique()}`;
	const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
	if (error) throw error;
	const id = data.user!.id;
	const { error: e2 } = await admin
		.from('profils')
		.insert({ id, prenom: 'Test', nom, email, role, notice_acceptee_le: new Date().toISOString() });
	if (e2) throw e2;
	const client = nouveauClientAnonyme();
	const { error: e3 } = await client.auth.signInWithPassword({ email, password });
	if (e3) throw e3;
	return { id, client };
}

export async function creerComptesDeTest(): Promise<ComptesDeTest> {
	const [f, a, b] = await Promise.all([
		creerCompte('formateur', 'formateur'),
		creerCompte('stagiaire', 'stagiaire-a'),
		creerCompte('stagiaire', 'stagiaire-b')
	]);
	return {
		formateur: f.client,
		stagiaireA: a.client,
		stagiaireB: b.client,
		ids: { formateur: f.id, stagiaireA: a.id, stagiaireB: b.id },
		nettoyer: async () => {
			for (const id of [f.id, a.id, b.id]) await admin.auth.admin.deleteUser(id);
		}
	};
}

/** Question complète (4 propositions, bonne réponse B) créée avec la clé administrateur. */
export async function creerQuestion(options: { statut?: string; usage?: string; themeId?: string | null; niveauId?: string | null } = {}) {
	const { data: q, error } = await admin
		.from('questions')
		.insert({
			enonce: `Question de test ${unique()}`,
			explication: 'Explication de test',
			statut: options.statut ?? 'validee',
			usage: options.usage ?? 'entrainement',
			theme_id: options.themeId ?? null,
			niveau_id: options.niveauId ?? null
		})
		.select('id')
		.single();
	if (error) throw error;
	const { data: props, error: e2 } = await admin
		.from('propositions')
		.insert(['A', 'B', 'C', 'D'].map((lettre) => ({ question_id: q.id, lettre, texte: `Réponse ${lettre}` })))
		.select('id, lettre');
	if (e2) throw e2;
	const parLettre = Object.fromEntries(props!.map((p) => [p.lettre, p.id])) as Record<'A' | 'B' | 'C' | 'D', string>;
	await admin.from('bonnes_reponses').insert({ question_id: q.id, proposition_id: parLettre.B });
	return { id: q.id as string, props: parLettre };
}

/** Examen officiel en brouillon créé par le formateur connecté (date : dans une heure). */
export async function creerExamen(formateur: SupabaseClient, options: { duree?: number; seuil?: number } = {}): Promise<string> {
	const { data, error } = await formateur
		.from('examens_officiels')
		.insert({
			titre: `Examen de test ${unique()}`,
			date_heure: new Date(Date.now() + 3600_000).toISOString(),
			lieu: 'Salle de test',
			duree_minutes: options.duree ?? 30,
			seuil_reussite: options.seuil ?? 1
		})
		.select('id')
		.single();
	if (error) throw error;
	return data.id as string;
}
