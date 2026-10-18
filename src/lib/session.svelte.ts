import type { Profil } from '#lib/auth.ts';
import { supabase } from '#lib/supabase.ts';

/** État de session partagé par toute l'application. */
export const session = $state<{ pret: boolean; profil: Profil | null }>({ pret: false, profil: null });

export async function chargerProfil(): Promise<Profil | null> {
	const { data } = await supabase.auth.getUser();
	if (!data.user) {
		session.profil = null;
	} else {
		const { data: p } = await supabase
			.from('profils')
			.select('id, prenom, nom, role, profil_formation, niveau_id, notice_acceptee_le')
			.eq('id', data.user.id)
			.single();
		session.profil = (p as Profil | null) ?? null;
	}
	session.pret = true;
	return session.profil;
}

export async function seDeconnecter() {
	await supabase.auth.signOut();
	session.profil = null;
}
