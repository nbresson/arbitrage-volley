// Crée le PREMIER compte formateur (les suivants se créent depuis l'espace formateur).
// Utilisation : npx tsx scripts/db/creer-formateur.ts --cible dev|prod --email … --prenom … --nom … [--site https://…]
// N'envoie aucun e-mail : affiche un lien d'invitation à ouvrir pour choisir son mot de passe.
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
const arg = (nom: string) => {
	const i = process.argv.indexOf(nom);
	return i > 0 ? process.argv[i + 1] : undefined;
};
const cible = arg('--cible') === 'prod' ? 'prod' : 'dev';
const url = cible === 'prod' ? process.env.SUPABASE_PROD_URL : process.env.SUPABASE_TEST_URL;
const cle = cible === 'prod' ? process.env.SUPABASE_PROD_SERVICE_KEY : process.env.SUPABASE_TEST_SERVICE_KEY;
const [email, prenom, nom] = [arg('--email')?.trim().toLowerCase(), arg('--prenom'), arg('--nom')];
if (!url || !cle || !email || !prenom || !nom) {
	console.error('Usage : creer-formateur.ts --cible dev|prod --email … --prenom … --nom … [--site https://…]');
	process.exit(1);
}
const site = arg('--site') ?? 'http://localhost:5173';
const admin = createClient(url, cle, { auth: { persistSession: false } });

const { data: niv } = await admin.from('niveaux').select('id').order('ordre').limit(1);
const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo: `${site}/mot-de-passe` } });
if (error) {
	console.error(`Échec : ${error.message}`);
	process.exit(1);
}
const { error: e2 } = await admin.from('profils').upsert({
	id: data.user.id,
	email,
	prenom,
	nom,
	role: 'formateur',
	profil_formation: 'arbitre',
	niveau_id: niv?.[0]?.id ?? null,
	mineur_parents_informes: false,
	actif: true
});
if (e2) {
	console.error(`Profil non créé : ${e2.message}`);
	process.exit(1);
}
console.log(`Formateur ${prenom} ${nom} créé (${cible}). Ouvrez ce lien pour choisir le mot de passe :\n${data.properties.action_link}`);
