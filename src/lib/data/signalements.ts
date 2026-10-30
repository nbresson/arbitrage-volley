// Signalement d'un problème sur une question : écrit par le stagiaire, lu et traité par les formateurs.
import { supabase } from '#lib/supabase.ts';

export type Signalement = { id: string; question_id: string; message: string; cree_le: string; traite_le: string | null; auteur: string | null };

export async function signalerProbleme(questionId: string, message: string) {
	const { error } = await supabase.from('signalements_question').insert({ question_id: questionId, message: message.trim() });
	if (error) throw new Error(error.message);
}

/** Formateur : signalements d'une question, les non traités d'abord. */
export async function signalementsDeQuestion(questionId: string): Promise<Signalement[]> {
	const { data, error } = await supabase
		.from('signalements_question')
		// Deux clés vers profils (auteur, traitant) : on nomme celle de l'auteur.
		.select('id, question_id, message, cree_le, traite_le, profils!signalements_question_stagiaire_id_fkey(prenom, nom)')
		.eq('question_id', questionId)
		.order('traite_le', { ascending: true, nullsFirst: true })
		.order('cree_le', { ascending: false });
	if (error) throw new Error(error.message);
	return (data ?? []).map((s: any) => ({
		id: s.id,
		question_id: s.question_id,
		message: s.message,
		cree_le: s.cree_le,
		traite_le: s.traite_le,
		auteur: s.profils ? `${s.profils.prenom} ${s.profils.nom}` : null
	}));
}

/** Formateur : nombre de signalements non traités par question (liste des questions). */
export async function signalementsNonTraites(): Promise<Map<string, number>> {
	const { data, error } = await supabase.from('signalements_question').select('question_id').is('traite_le', null);
	if (error) throw new Error(error.message);
	const m = new Map<string, number>();
	for (const s of data ?? []) m.set(s.question_id, (m.get(s.question_id) ?? 0) + 1);
	return m;
}

export async function traiterSignalement(id: string) {
	const { error } = await supabase.from('signalements_question').update({ traite_le: new Date().toISOString() }).eq('id', id);
	if (error) throw new Error(error.message);
}
