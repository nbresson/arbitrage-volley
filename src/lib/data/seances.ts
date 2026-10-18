import { supabase } from '#lib/supabase.ts';
import type { QuestionSeance, ResultatValidation } from '#lib/seance/pedagogique.ts';
import type { ParametresSeance } from './parametres-seance.ts';

export type Option = { id: string; libelle: string };

/** Thèmes et niveaux (listes gérées par les formateurs). */
export async function referentiel(): Promise<{ themes: Option[]; niveaux: Option[] }> {
	const [t, n] = await Promise.all([
		supabase.from('themes').select('id, libelle').order('ordre'),
		supabase.from('niveaux').select('id, libelle').order('ordre')
	]);
	if (t.error || n.error) throw t.error ?? n.error;
	return { themes: t.data ?? [], niveaux: n.data ?? [] };
}

/** Crée une séance côté base (tirage des questions) et renvoie son identifiant. */
export async function creerSeance(p: ParametresSeance): Promise<string> {
	const { data, error } = await supabase.rpc('creer_seance', {
		p_type: p.type,
		p_theme_ids: p.themeIds.length ? p.themeIds : null,
		p_regle_id: p.regleId,
		p_niveau_id: p.niveauId,
		p_role: p.role,
		p_nb: p.nb,
		p_duree_minutes: p.dureeMinutes
	});
	if (error) throw new Error(error.message);
	return data as string;
}

export type InfoSeance = {
	id: string;
	type: ParametresSeance['type'];
	debut: string;
	fin: string | null;
	duree_minutes: number | null;
	nb_questions: number;
};

export async function infoSeance(id: string): Promise<InfoSeance> {
	const { data, error } = await supabase
		.from('seances')
		.select('id, type, debut, fin, duree_minutes, nb_questions')
		.eq('id', id)
		.single();
	if (error) throw new Error(error.message);
	return data as InfoSeance;
}

/**
 * Questions de la séance, jamais avec les bonnes réponses.
 * correcte_precedente : séance pédagogique uniquement (null si pas encore répondue, toujours null en examen).
 * proposition_choisie / signalee : la réponse déjà donnée par le stagiaire dans cette séance.
 */
export type QuestionSeanceAvecEtat = QuestionSeance & {
	correcte_precedente: boolean | null;
	proposition_choisie: string | null;
	signalee: boolean;
};

export async function questionsDeSeance(id: string): Promise<QuestionSeanceAvecEtat[]> {
	const { data, error } = await supabase.rpc('questions_de_seance', { p_seance: id });
	if (error) throw new Error(error.message);
	return data ?? [];
}

export async function validerReponse(seance: string, question: string, proposition: string, reponduLe?: string) {
	const { data, error } = await supabase.rpc('valider_reponse', {
		p_seance: seance,
		p_question: question,
		p_proposition: proposition,
		...(reponduLe ? { p_repondu_le: reponduLe } : {})
	});
	if (error) throw new Error(error.message);
	return data as ResultatValidation | { enregistree: true };
}

export async function signalerQuestion(seance: string, question: string, signalee: boolean) {
	const { error } = await supabase.rpc('signaler_question', { p_seance: seance, p_question: question, p_signalee: signalee });
	if (error) throw new Error(error.message);
}

export type BilanSeance = { score: number; total: number; par_theme: { theme_id: string; theme: string; justes: number; total: number }[] };

export async function terminerSeance(id: string): Promise<BilanSeance> {
	const { data, error } = await supabase.rpc('terminer_seance', { p_seance: id });
	if (error) throw new Error(error.message);
	return data as BilanSeance;
}

export const urlSeance =(type: ParametresSeance['type'], id: string) =>
	type === 'pedagogique' ? `/entrainement/${id}` : `/examen-entrainement/${id}`;
