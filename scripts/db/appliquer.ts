// Applique les migrations puis le référentiel à une base Supabase.
// Utilisation : npx tsx scripts/db/appliquer.ts --cible dev|prod
// La chaîne de connexion est lue dans .env.local (SUPABASE_TEST_DB_URL ou SUPABASE_PROD_DB_URL).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env.local', quiet: true });

const cible = process.argv.includes('prod') ? 'prod' : 'dev';
const url = cible === 'prod' ? process.env.SUPABASE_PROD_DB_URL : process.env.SUPABASE_TEST_DB_URL;
if (!url) {
	console.error(`Chaîne de connexion absente pour la cible « ${cible} » dans .env.local`);
	process.exit(1);
}

console.log(`Migrations → ${cible}`);
// shell nécessaire sous Windows pour npx : l'URL est passée entre guillemets.
execFileSync('npx', ['supabase', 'db', 'push', '--db-url', `"${url}"`, '--include-all', '--yes'], { stdio: 'inherit', shell: true });

console.log('Référentiel…');
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(readFileSync('supabase/seed/referentiel.sql', 'utf8'));
await client.end();
console.log('Terminé.');
