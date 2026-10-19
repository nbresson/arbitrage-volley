import type { RoleCible } from '#lib/domain/types.ts';

export type Profil = {
	id: string;
	prenom: string;
	nom: string;
	role: 'stagiaire' | 'formateur';
	profil_formation: Exclude<RoleCible, 'les_deux'>;
	niveau_id: string;
	notice_acceptee_le: string | null;
	actif: boolean;
};

const PAGES_PUBLIQUES = ['/connexion', '/mot-de-passe'];
const DESACTIVE = '/compte-desactive';

/** Renvoie l'URL vers laquelle rediriger, ou null si la page demandée est autorisée. */
export function garde(profil: Profil | null, chemin: string): string | null {
	const publique = PAGES_PUBLIQUES.some((p) => chemin === p || chemin.startsWith(`${p}/`));
	if (!profil) return publique ? null : '/connexion';
	if (chemin === '/connexion') return '/';
	if (!profil.actif) return chemin === DESACTIVE ? null : DESACTIVE;
	if (chemin === DESACTIVE) return '/';
	// Arrivée par le lien d'invitation : choisir son mot de passe avant tout le reste.
	if (chemin === '/mot-de-passe') return null;
	if (!profil.notice_acceptee_le) return chemin === '/notice' ? null : '/notice';
	if (chemin.startsWith('/formateur') && profil.role !== 'formateur') return '/';
	return null;
}
