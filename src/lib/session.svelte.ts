import type { Profil } from '#lib/auth.ts';
import { supabase } from '#lib/supabase.ts';

/** État de session partagé par toute l'application. */
export const session = $state<{ pret: boolean; profil: Profil | null }>({ pret: false, profil: null });

// Le profil est gardé sur l'appareil : hors ligne, l'application reste utilisable (règles en cache).
const CLE_PROFIL = 'profil-hors-ligne';

function garderProfil(p: Profil | null) {
	try {
		if (p) localStorage.setItem(CLE_PROFIL, JSON.stringify(p));
		else localStorage.removeItem(CLE_PROFIL);
	} catch {
		/* stockage indisponible */
	}
}

function profilGarde(): Profil | null {
	try {
		return JSON.parse(localStorage.getItem(CLE_PROFIL) ?? 'null');
	} catch {
		return null;
	}
}

/** Erreur de réseau (et non refus du serveur) : on peut se rabattre sur la session gardée. */
const erreurReseau = (e: { name?: string; status?: number } | null) => !!e && (e.name === 'AuthRetryableFetchError' || e.status === 0);

export async function chargerProfil(): Promise<Profil | null> {
	const { data, error } = await supabase.auth.getUser();
	if (!data.user && erreurReseau(error)) {
		// Hors ligne : la session locale doit être celle du profil gardé.
		const { data: s } = await supabase.auth.getSession();
		const garde = profilGarde();
		session.profil = s.session && garde && garde.id === s.session.user.id ? garde : null;
	} else if (!data.user) {
		session.profil = null;
	} else {
		const { data: p } = await supabase
			.from('profils')
			.select('id, prenom, nom, role, profil_formation, niveau_id, notice_acceptee_le, actif')
			.eq('id', data.user.id)
			.single();
		session.profil = (p as Profil | null) ?? null;
		garderProfil(session.profil);
	}
	session.pret = true;
	return session.profil;
}

export async function seDeconnecter() {
	garderProfil(null);
	await supabase.auth.signOut();
	session.profil = null;
}
