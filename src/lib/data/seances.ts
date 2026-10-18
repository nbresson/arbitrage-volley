import { supabase } from '#lib/supabase.ts';
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

export const urlSeance = (type: ParametresSeance['type'], id: string) =>
	type === 'pedagogique' ? `/entrainement/${id}` : `/examen-entrainement/${id}`;
