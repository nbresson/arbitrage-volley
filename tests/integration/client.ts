// Clients Supabase pour les tests d'intégration (projet de DÉVELOPPEMENT uniquement).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const url = process.env.SUPABASE_TEST_URL;
const anon = process.env.SUPABASE_TEST_ANON_KEY;
const service = process.env.SUPABASE_TEST_SERVICE_KEY;
if (!url || !anon || !service) throw new Error('Variables SUPABASE_TEST_* manquantes dans .env.local');

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** Client administrateur : contourne les règles d'accès. À réserver à la préparation des données. */
export const admin: SupabaseClient = createClient(url, service, options);

export const nouveauClientAnonyme = (): SupabaseClient => createClient(url, anon, options);

/** Suffixe unique pour isoler les données d'un lancement de tests. */
export const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
