// Déploie les fonctions serveur (Edge Functions) sur le projet Supabase visé.
// Utilisation : npx tsx scripts/db/deployer-fonctions.ts --cible dev|prod
// Lit SUPABASE_ACCESS_TOKEN et l'URL du projet dans .env.local. Ne nécessite pas Docker (--use-api).
import { execFileSync } from 'node:child_process';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const cible = process.argv.includes('prod') ? 'prod' : 'dev';
const url = cible === 'prod' ? process.env.SUPABASE_PROD_URL : process.env.SUPABASE_TEST_URL;
const ref = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!ref || !process.env.SUPABASE_ACCESS_TOKEN) {
	console.error(`URL du projet ou SUPABASE_ACCESS_TOKEN absent pour la cible « ${cible} » dans .env.local`);
	process.exit(1);
}

for (const fonction of ['creer-compte']) {
	console.log(`Déploiement de ${fonction} → ${cible}`);
	execFileSync('npx', ['supabase', 'functions', 'deploy', fonction, '--project-ref', ref, '--use-api'], {
		stdio: 'inherit',
		shell: true,
		env: { ...process.env } // le jeton est transmis par la variable d'environnement, jamais en argument
	});
}
