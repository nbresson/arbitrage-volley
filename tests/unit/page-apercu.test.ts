// Aperçu côté stagiaire : pas de chiffres faux pendant le chargement, pluriel accordé.
import { render } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ apercu: vi.fn() }));
vi.mock('$app/state', () => ({ page: { params: { id: 'e1' }, url: new URL('http://x/') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), onNavigate: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/session.svelte.ts', () => ({ session: { pret: true, profil: null }, chargerProfil: vi.fn(), seDeconnecter: vi.fn() }));
vi.mock('#lib/data/seances.ts', async (orig) => ({ ...(await orig<typeof import('../../src/lib/data/seances')>()), seanceEnCours: async () => false }));
vi.mock('#lib/data/examens-formateur.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/examens-formateur')>()),
	lireExamen: async () => ({ id: 'e1', titre: 'Examen', duree_minutes: 30 }),
	apercuExamen: h.apercu
}));

import Apercu from '../../src/routes/formateur/examens/[id]/apercu/+page.svelte';

beforeEach(() => vi.clearAllMocks());

test('bandeau absent pendant le chargement', () => {
	h.apercu.mockReturnValue(new Promise(() => {}));
	const e = render(Apercu);
	expect(e.queryByRole('note')).toBeNull();
});

test('« 1 question » au singulier', async () => {
	h.apercu.mockResolvedValue([{ ordre: 1, enonce: 'Q', theme: 'T', propositions: [{ lettre: 'A', texte: 'a' }] }]);
	const e = render(Apercu);
	expect(await e.findByRole('note')).toHaveTextContent('(1 question, 30 minutes)');
});
