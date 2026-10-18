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

export async function listerComptes(): Promise<Compte[]> {
	const { data, error } = await supabase
		.from('profils')
		.select('id, prenom, nom, email, role, profil_formation, niveau_id, actif')
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
