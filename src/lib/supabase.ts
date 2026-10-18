import { createClient } from '@supabase/supabase-js';

// Clés publiques (URL et clé « anon ») : la sécurité repose sur les règles d'accès de la base.
export const supabase = createClient(
	import.meta.env.PUBLIC_SUPABASE_URL ?? '',
	import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? ''
);
