// Questions marquées « à revoir plus tard » par le stagiaire (privées).
import { supabase } from '#lib/supabase.ts';

export async function mesMarquees(): Promise<Set<string>> {
	const { data, error } = await supabase.from('questions_marquees').select('question_id');
	if (error) throw new Error(error.message);
	return new Set((data ?? []).map((m) => m.question_id as string));
}

export async function marquer(questionId: string, marquee: boolean) {
	const { error } = marquee
		? await supabase.from('questions_marquees').upsert({ question_id: questionId }, { onConflict: 'stagiaire_id,question_id' })
		: await supabase.from('questions_marquees').delete().eq('question_id', questionId);
	if (error) throw new Error(error.message);
}

/** Nouvelle séance pédagogique faite des questions marquées. */
export async function seanceMarquees(): Promise<string> {
	const { data, error } = await supabase.rpc('seance_marquees');
	if (error) throw new Error(error.message);
	return data as string;
}
