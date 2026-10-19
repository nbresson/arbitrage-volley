// Création d'un compte (stagiaire ou formateur) par un formateur, avec invitation par e-mail.
// Seule cette fonction détient la clé d'administration ; elle vérifie que l'appelant est un formateur actif.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const reponse = (status: number, corps: unknown) =>
	new Response(JSON.stringify(corps), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Corps = {
	email?: string;
	prenom?: string;
	nom?: string;
	role?: string;
	profil_formation?: string;
	niveau_id?: string | null;
	mineur_parents_informes?: boolean;
	envoyer_email?: boolean;
	redirection?: string;
};

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
	if (req.method !== 'POST') return reponse(405, { message: 'Méthode non autorisée.' });

	const url = Deno.env.get('SUPABASE_URL')!;
	const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

	// Appelant : formateur actif
	const jeton = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
	if (!jeton) return reponse(401, { message: 'Connexion requise.' });
	const { data: appelant, error: eAuth } = await admin.auth.getUser(jeton);
	if (eAuth || !appelant.user) return reponse(401, { message: 'Connexion requise.' });
	const { data: profil } = await admin.from('profils').select('role, actif').eq('id', appelant.user.id).single();
	if (!profil || profil.role !== 'formateur' || !profil.actif) return reponse(403, { message: 'Seuls les formateurs peuvent créer des comptes.' });

	let c: Corps;
	try {
		c = await req.json();
	} catch {
		return reponse(400, { message: 'Requête illisible.' });
	}
	const email = c.email?.trim().toLowerCase() ?? '';
	if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reponse(422, { message: 'Adresse e-mail invalide.' });
	if (!c.prenom?.trim() || !c.nom?.trim()) return reponse(422, { message: 'Prénom et nom obligatoires.' });
	if (!['stagiaire', 'formateur'].includes(c.role ?? '')) return reponse(422, { message: 'Rôle inconnu.' });
	if (!['arbitre', 'marqueur'].includes(c.profil_formation ?? '')) return reponse(422, { message: 'Profil de formation inconnu.' });
	if (typeof c.mineur_parents_informes !== 'boolean') {
		return reponse(422, { message: 'Indiquez si la personne est mineure et si ses parents ont été informés.' });
	}

	// Adresse déjà utilisée : refus AVANT toute création (Supabase renverrait sinon le compte existant).
	const { data: existant } = await admin.from('profils').select('id').eq('email', email).limit(1);
	if (existant?.length) return reponse(409, { message: 'Un compte existe déjà avec cette adresse.' });

	const redirectTo = c.redirection ??`${Deno.env.get('SITE_URL') ?? new URL(req.headers.get('origin') ?? url).origin}/mot-de-passe`;
	let id: string;
	let lien: string | undefined;
	if (c.envoyer_email === false) {
		// Sans e-mail : le lien d'invitation est rendu au formateur, qui le transmet lui-même.
		const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo } });
		if (error) return erreurAuth(error);
		id = data.user.id;
		lien = data.properties.action_link;
	} else {
		const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
		if (error) return erreurAuth(error);
		id = data.user.id;
	}

	const { error: eProfil } = await admin.from('profils').insert({
		id,
		email,
		prenom: c.prenom.trim(),
		nom: c.nom.trim(),
		role: c.role,
		profil_formation: c.profil_formation,
		niveau_id: c.niveau_id || null,
		mineur_parents_informes: c.mineur_parents_informes
	});
	if (eProfil) {
		// 23505 : un profil existe déjà pour ce compte → c'était un compte existant, on n'y touche surtout pas.
		if (eProfil.code === '23505') return reponse(409, { message: 'Un compte existe déjà avec cette adresse.' });
		// Compte d'authentification créé à l'instant mais sans profil : on le retire pour permettre un nouvel essai.
		const { data: autre } = await admin.from('profils').select('id').eq('id', id).maybeSingle();
		if (!autre) await admin.auth.admin.deleteUser(id);
		return reponse(500, { message: 'Le profil n’a pas pu être créé.' });
	}
	return reponse(201, lien ? { id, lien } : { id });
});

function erreurAuth(error: { message?: string; status?: number; code?: string }) {
	const deja = error.code === 'email_exists' || /already (been )?registered|already exists/i.test(error.message ?? '');
	if (deja) return reponse(409, { message: 'Un compte existe déjà avec cette adresse.' });
	return reponse(502, { message: 'Le compte n’a pas pu être créé (service d’authentification). Réessayez plus tard.' });
}
