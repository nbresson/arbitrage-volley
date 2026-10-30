import type { SeanceReponses } from '#lib/formateur/courbes.ts';
import { supabase } from '#lib/supabase.ts';

export type Compte = {
	id: string;
	prenom: string;
	nom: string;
	email: string | null;
	role: 'stagiaire' | 'formateur';
	profil_formation: 'arbitre' | 'marqueur';
	niveau_id: string | null;
	actif: boolean;
	promotion: string | null;
};

export type NouveauCompte = {
	email: string;
	prenom: string;
	nom: string;
	role: 'stagiaire' | 'formateur';
	profil_formation: 'arbitre' | 'marqueur';
	niveau_id: string;
	mineur_parents_informes: boolean;
};

/** Les 5 dernières séances pédagogiques de chaque stagiaire (courbes de réussite), sans plafond global. */
export async function seancesRecentes(): Promise<SeanceReponses[]> {
	const { data, error } = await supabase.rpc('dernieres_seances', { p_n: 5 });
	if (error) throw new Error(error.message);
	return ((data ?? []) as { stagiaire_id: string; debut: string; justes: number; total: number }[]).map((l) => ({
		stagiaire_id: l.stagiaire_id,
		debut: l.debut,
		reponses: Array.from({ length: l.total }, (_, i) => ({ correcte: i < l.justes }))
	}));
}

export async function listerComptes(): Promise<Compte[]> {
	const { data, error } = await supabase
		.from('profils')
		.select('id, prenom, nom, email, role, profil_formation, niveau_id, actif, promotion')
		.order('nom');
	if (error) throw new Error(error.message);
	return data ?? [];
}

/** Appelle la fonction serveur creer-compte (invitation par e-mail). Renvoie un message d'erreur lisible. */
export async function creerCompte(c: NouveauCompte): Promise<{ ok: true } | { ok: false; message: string }> {
	const { error } = await supabase.functions.invoke('creer-compte', { body: c });
	if (!error) return { ok: true };
	const reponse = (error as any).context as Response | undefined;
	const statut = reponse?.status;
	let message = 'Le compte n’a pas pu être créé. Vérifiez votre connexion puis réessayez.';
	try {
		const corps = reponse ? await reponse.json() : null;
		if (corps?.message) message = corps.message;
	} catch {
		/* corps illisible : message générique */
	}
	if (statut === 403) message = 'Seuls les formateurs peuvent créer des comptes.';
	return { ok: false, message };
}

export async function changerActivation(id: string, actif: boolean) {
	const { error } = await supabase.from('profils').update({ actif }).eq('id', id);
	if (error) throw new Error(error.message);
}

/** Promotion (session de formation) d'un compte ; vide pour l'enlever. */
export async function changerPromotion(id: string, promotion: string) {
	const { error } = await supabase.from('profils').update({ promotion: promotion.trim() || null }).eq('id', id);
	if (error) throw new Error(error.message);
}

/** Pose la promotion du compte qui vient d'être créé (la fonction de création ne la connaît pas). */
export async function promotionParEmail(email: string, promotion: string) {
	if (!promotion.trim()) return;
	const { error } = await supabase.from('profils').update({ promotion: promotion.trim() }).eq('email', email.trim());
	if (error) throw new Error(error.message);
}

/** Date de dernière activité de chaque stagiaire (séances pédagogiques et examens officiels). */
export async function activiteStagiaires(): Promise<Map<string, string>> {
	const { data, error } = await supabase.rpc('activite_stagiaires');
	if (error) throw new Error(error.message);
	return new Map(((data ?? []) as { stagiaire_id: string; derniere: string }[]).map((l) => [l.stagiaire_id, l.derniere]));
}
