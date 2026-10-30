// Tests d'accessibilité automatiques (axe-core) sur les pages et écrans principaux, données simulées.
// Le contraste des couleurs n'est pas mesurable sans moteur de rendu : il est vérifié à part (DESIGN.md, palette calculée).
import { render } from '@testing-library/svelte';
import axe from 'axe-core';
import { beforeEach, expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ params: {} as Record<string, string> }));
const regle = (reference: string, parent_reference: string | null, texte = 'Le libéro ne peut pas servir.') => ({
	id: `id-${reference}`, edition: 'Règles officielles', source: 'fivb_regles', reference, parent_reference, titre: null, texte, texte_original: null, renvois: [], video_url: null
});
const convocation = {
	examen_id: 'e1', titre: 'Examen de fin de module', date_heure: '2026-11-01T09:00:00Z', lieu: 'Salle 2', duree_minutes: 45,
	nb_questions: 30, formateur: 'Ana Formatrice', statut: 'ouvert', tentative_id: null, terminee: false
};

vi.mock('$app/state', () => ({ page: { get params() { return h.params; }, url: new URL('http://x/') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), onNavigate: vi.fn(), replaceState: vi.fn() }));
vi.mock('#lib/supabase.ts', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { email: 'camille@exemple.fr' } } }) } } }));
vi.mock('#lib/session.svelte.ts', () => ({
	session: { pret: true, profil: { id: 'u1', prenom: 'Camille', nom: 'Essai', role: 'stagiaire', profil_formation: 'arbitre', niveau_id: 'n1', notice_acceptee_le: '2026-10-01', actif: true } },
	chargerProfil: vi.fn(),
	seDeconnecter: vi.fn()
}));
vi.mock('#lib/data/seances.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/seances')>()),
	referentiel: async () => ({ themes: [{ id: 't1', libelle: 'Service' }], niveaux: [{ id: 'n1', libelle: 'Niveau 1' }] }),
	mesExamensBlancs: async () => [
		{ id: 'a', debut: '2026-10-01T10:00:00Z', fin: '2026-10-01T10:40:00Z', duree_minutes: 45, score: 18, total: 30 },
		{ id: 'b', debut: '2026-10-05T10:00:00Z', fin: '2026-10-05T10:31:00Z', duree_minutes: 45, score: 24, total: 30 }
	],
	seanceEnCours: async () => false
}));
vi.mock('#lib/data/regles.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/regles')>()),
	toutesLesRegles: async () => [regle('19', null), regle('19.1', '19'), regle('19.2', '19')],
	glossaire: async () => [{ id: 'g', terme: 'libéro', definition: 'Joueur spécialiste de la défense.' }],
	figures: async () => [],
	mesEpingles: async () => [],
	nbQuestionsRegle: async () => 3
}));
vi.mock('#lib/data/examens-officiels.ts', async (orig) => ({
	...(await orig<typeof import('../../src/lib/data/examens-officiels')>()),
	mesConvocations: async () => [convocation],
	mesurerConnexion: async () => ({ etat: 'stable', texte: 'Connexion stable.' })
}));

import ResultatExamen from '../../src/lib/components/ResultatExamen.svelte';
import Aide from '../../src/routes/aide/+page.svelte';
import Convocation from '../../src/routes/convocation/[examen]/+page.svelte';
import SaisieCode from '../../src/routes/examen-officiel/[examen]/+page.svelte';
import ExamensBlancs from '../../src/routes/examens-blancs/+page.svelte';
import Preferences from '../../src/routes/preferences/+page.svelte';
import Profil from '../../src/routes/profil/+page.svelte';
import Regles from '../../src/routes/regles/+page.svelte';
import FicheRegle from '../../src/routes/regles/[edition]/[reference]/+page.svelte';

beforeEach(() => localStorage.clear());

async function verifier(conteneur: HTMLElement) {
	await new Promise((r) => setTimeout(r, 30)); // chargements simulés
	const r = await axe.run(conteneur, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
	const resume = r.violations.map((v) => `${v.id} : ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
	expect(resume).toEqual([]);
}

const pages = [
	['Préférences', Preferences, {}],
	['Aide', Aide, {}],
	['Mon profil', Profil, {}],
	['Mes examens blancs', ExamensBlancs, {}],
	['Règles', Regles, {}],
	['Fiche d’une règle', FicheRegle, { edition: 'regles-officielles', reference: '19.1' }],
	['Salle d’examen', SaisieCode, { examen: 'e1' }],
	['Convocation imprimable', Convocation, { examen: 'e1' }]
] as const;

for (const [nom, Page, params] of pages) {
	test(`${nom} : aucune erreur d’accessibilité détectée`, async () => {
		h.params = { ...params };
		const { container } = render(Page);
		await verifier(container);
	});
}

test('Résultat d’un examen blanc : aucune erreur d’accessibilité détectée', async () => {
	const { container } = render(ResultatExamen, {
		bilan: { score: 24, total: 30, par_theme: [{ theme_id: 't1', theme: 'Service', justes: 8, total: 10 }] },
		officiel: null,
		sousTitre: 'Résultat',
		blanc: { seanceId: 's1', temps: '31 min sur 45', comparaison: null, date: '2026-10-18T10:31:00Z' }
	});
	await verifier(container);
});
