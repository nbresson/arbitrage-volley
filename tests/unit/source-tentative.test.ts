// sourceTentative : branchement de l'écran d'examen sur une tentative officielle (base simulée).
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: { rpc: h.rpc } }));

import { sourceTentative } from '../../src/lib/data/examens-officiels';

const info = (debutIlYa: number, maintenant = new Date()) => ({
	id: 't1', examen_id: 'e1', titre: 'Examen', debut: new Date(maintenant.getTime() - debutIlYa).toISOString(),
	fin: null, duree_minutes: 30, nb_questions: 1, maintenant: maintenant.toISOString()
});

beforeEach(() => h.rpc.mockReset());

test('transmet l’heure du serveur et les questions, la valeur choisie est la lettre', async () => {
	h.rpc.mockImplementation(async (fn: string) =>
		fn === 'info_tentative'
			? { data: [info(5 * 60_000)], error: null }
			: { data: [{ ordre: 1, question_id: 'q1', enonce: 'É', theme: 'Service', propositions: [{ lettre: 'A', texte: 'a' }], lettre_choisie: 'A', signalee: false }], error: null }
	);
	const d = await sourceTentative('t1').charger();
	expect(d.maintenant).toBeTruthy();
	expect(d.questions[0]).toMatchObject({ questionId: 'q1', choisie: 'A', propositions: [{ valeur: 'A', lettre: 'A', texte: 'a' }] });
});

test('temps écoulé selon le serveur : les questions ne sont pas redemandées', async () => {
	h.rpc.mockResolvedValue({ data: [info(40 * 60_000)], error: null });
	const d = await sourceTentative('t1').charger();
	expect(d.questions).toEqual([]);
	expect(h.rpc).toHaveBeenCalledTimes(1);
});
