import { describe, expect, test } from 'vitest';
import type { Convocation } from '../../src/lib/data/examens-officiels';
import { etatConvocation, examenActif, normaliserCode } from '../../src/lib/examen-officiel/convocation';

describe('normaliserCode', () => {
	test('ne garde que les chiffres', () => {
		expect(normaliserCode(' 12 34-56 ')).toBe('123456');
		expect(normaliserCode('abc')).toBe('');
	});
});

describe('etatConvocation', () => {
	const base: Convocation = {
		examen_id: 'e1', titre: 'Examen', date_heure: '2026-11-01T09:00:00Z', lieu: 'Salle', duree_minutes: 45,
		nb_questions: 30, formateur: 'Ana Formatrice', statut: 'brouillon', tentative_id: null, terminee: false
	};
	test.each([
		[{}, 'a_venir'],
		[{ statut: 'ouvert' }, 'ouvert'],
		[{ statut: 'ouvert', tentative_id: 't1' }, 'en_cours'],
		[{ statut: 'clos', tentative_id: 't1', terminee: true }, 'termine']
	] as const)('%o → %s', (diff, attendu) => {
		expect(etatConvocation({ ...base, ...diff })).toBe(attendu);
	});
});

describe('examenActif', () => {
	const c = (statut: Convocation['statut'], tentative_id: string | null = null, terminee = false): Convocation => ({
		examen_id: 'e', titre: 'E', date_heure: '2026-11-01T09:00:00Z', lieu: '', duree_minutes: 45, nb_questions: 30, formateur: null, statut, tentative_id, terminee
	});
	test('vrai si ouvert ou en cours, faux si à venir ou terminé', () => {
		expect(examenActif([c('brouillon'), c('ouvert')])).toBe(true);
		expect(examenActif([c('ouvert', 't1')])).toBe(true);
		expect(examenActif([c('brouillon'), c('clos', 't1', true)])).toBe(false);
		expect(examenActif([])).toBe(false);
	});
});
