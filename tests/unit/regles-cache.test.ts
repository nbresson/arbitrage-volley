// Les règles sont gardées en mémoire ; une modification des consignes CFA doit vider ce cache.
import { expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ lectures: 0 }));
vi.mock('#lib/supabase.ts', () => {
	const requete: any = {
		select: () => requete,
		eq: () => requete,
		order: () => requete,
		range: async () => (h.lectures++, { data: [], error: null })
	};
	return { supabase: { from: () => requete } };
});

import { toutesLesRegles, viderCacheRegles } from '../../src/lib/data/regles';

test('une seule lecture tant que le cache est valide, une nouvelle après viderCacheRegles', async () => {
	await toutesLesRegles();
	await toutesLesRegles();
	expect(h.lectures).toBe(1);
	viderCacheRegles();
	await toutesLesRegles();
	expect(h.lectures).toBe(2);
});
