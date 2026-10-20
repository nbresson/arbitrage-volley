// toutesLesRegles charge les règles par pages de 1000 (plafond de l'API Supabase).
import { expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ ranges: [] as [number, number][], pages: [1000, 5] }));

vi.mock('#lib/supabase.ts', () => {
	const requete: any = {
		select: () => requete,
		eq: () => requete,
		order: () => requete,
		range: async (debut: number, fin: number) => {
			h.ranges.push([debut, fin]);
			const n = h.pages[h.ranges.length - 1] ?? 0;
			const data = Array.from({ length: n }, (_, i) => ({
				id: `r${debut + i}`, reference: `${debut + i}`, parent_reference: null, titre: null, texte: '', texte_original: null,
				renvois: [], video_url: null, editions: { libelle: 'Règles', source: 'fivb_regles', active: true }
			}));
			return { data, error: null };
		}
	};
	return { supabase: { from: () => requete } };
});

import { toutesLesRegles } from '../../src/lib/data/regles';

test('toutes les pages sont lues jusqu’à une page incomplète', async () => {
	const regles = await toutesLesRegles();
	expect(regles).toHaveLength(1005);
	expect(h.ranges).toEqual([[0, 999], [1000, 1999]]);
});
