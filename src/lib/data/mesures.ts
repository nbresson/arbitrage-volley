// Mesures d'usage pour le comité (totaux anonymes) et avis après l'examen officiel.
import { supabase } from '#lib/supabase.ts';
import { ErreurServeur } from './seances.ts';

export type MesureJour = { jour: string; seances: number; stagiaires: number; reponses: number };
export type MesureTheme = { theme: string; reponses: number; justes: number };

export async function mesuresJours(jours = 30): Promise<MesureJour[]> {
	const { data, error } = await supabase.rpc('mesures_jours', { p_jours: jours });
	if (error) throw new Error(error.message);
	return data ?? [];
}

export async function mesuresThemes(jours = 30): Promise<MesureTheme[]> {
	const { data, error } = await supabase.rpc('mesures_themes', { p_jours: jours });
	if (error) throw new Error(error.message);
	return data ?? [];
}

export type Avis = { note: number; commentaire: string | null };

export async function monAvis(tentative: string): Promise<Avis | null> {
	const { data, error } = await supabase.rpc('mon_avis', { p_tentative: tentative });
	if (error) throw new Error(error.message);
	return (data as Avis[])?.[0] ?? null;
}

export async function donnerAvis(tentative: string, note: number, commentaire: string) {
	const { error } = await supabase.rpc('donner_avis', { p_tentative: tentative, p_note: note, p_commentaire: commentaire });
	if (error) throw error.code ? new ErreurServeur(error.message, error.code) : new Error(error.message);
}

export async function avisDeLExamen(examen: string): Promise<(Avis & { cree_le: string })[]> {
	const { data, error } = await supabase.rpc('avis_de_l_examen', { p_examen: examen });
	if (error) throw new Error(error.message);
	return data ?? [];
}
