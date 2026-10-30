import { describe, expect, test } from 'vitest';
import { fichierIcs, joursAvant, serieDeJours, seancesDeLaSemaine, tempsRestantEstime, trierLignes } from '../../src/lib/domain/accueil.ts';

const J = (jour: string) => `${jour}T10:00:00+01:00`;
const AUJOURDHUI = new Date('2026-10-30T15:00:00+01:00'); // un vendredi

describe('serieDeJours', () => {
	test('compte les jours consécutifs terminés par aujourd’hui ou hier', () => {
		expect(serieDeJours([J('2026-10-30'), J('2026-10-29'), J('2026-10-28')], AUJOURDHUI)).toBe(3);
		expect(serieDeJours([J('2026-10-29'), J('2026-10-28')], AUJOURDHUI)).toBe(2);
		expect(serieDeJours([J('2026-10-28')], AUJOURDHUI)).toBe(0);
	});
	test('plusieurs séances le même jour comptent pour un', () => {
		expect(serieDeJours([J('2026-10-30'), '2026-10-30T20:00:00+01:00', J('2026-10-29')], AUJOURDHUI)).toBe(2);
	});
	test('sans séance : 0', () => {
		expect(serieDeJours([], AUJOURDHUI)).toBe(0);
	});
});

describe('seancesDeLaSemaine', () => {
	test('compte les séances depuis le lundi', () => {
		expect(seancesDeLaSemaine([J('2026-10-30'), J('2026-10-26'), J('2026-10-25')], AUJOURDHUI)).toBe(2);
	});
});

describe('trierLignes', () => {
	const l = (theme: string, acquises: number, aRevoir: number, total: number, ordre: number) => ({ themeId: theme, theme, acquises, aRevoir, total, commence: acquises + aRevoir > 0, ordre });
	const lignes = [l('Service', 8, 0, 10, 1), l('Contre', 2, 5, 10, 2), l('Libéro', 0, 0, 10, 3), l('Attaque', 3, 3, 10, 4)];
	test('ordre du règlement : inchangé', () => {
		expect(trierLignes(lignes, 'reglement').map((x) => x.theme)).toEqual(['Service', 'Contre', 'Libéro', 'Attaque']);
	});
	test('faibles d’abord : plus d’à revoir, puis les non commencés, puis les acquis', () => {
		expect(trierLignes(lignes, 'faibles').map((x) => x.theme)).toEqual(['Contre', 'Attaque', 'Libéro', 'Service']);
	});
	test('alphabétique', () => {
		expect(trierLignes(lignes, 'alpha').map((x) => x.theme)).toEqual(['Attaque', 'Contre', 'Libéro', 'Service']);
	});
});

describe('joursAvant', () => {
	test('en jours entiers, depuis aujourd’hui', () => {
		expect(joursAvant('2026-11-15T09:30:00+01:00', AUJOURDHUI)).toBe(16);
		expect(joursAvant('2026-10-31T09:30:00+01:00', AUJOURDHUI)).toBe(1);
		expect(joursAvant('2026-10-30T18:00:00+01:00', AUJOURDHUI)).toBe(0);
		expect(joursAvant('2026-10-20T18:00:00+01:00', AUJOURDHUI)).toBe(-10);
	});
});

describe('tempsRestantEstime', () => {
	test('environ 45 secondes par question, arrondi à la minute, au moins 1', () => {
		expect(tempsRestantEstime(7)).toBe(5);
		expect(tempsRestantEstime(1)).toBe(1);
		expect(tempsRestantEstime(0)).toBe(0);
	});
});

describe('fichierIcs', () => {
	test('un événement avec titre, lieu, début et fin', () => {
		const ics = fichierIcs({ titre: 'Examen départemental', lieu: 'Gymnase', date_heure: '2026-11-15T08:30:00Z', duree_minutes: 45 });
		expect(ics).toContain('BEGIN:VCALENDAR');
		expect(ics).toContain('SUMMARY:Examen départemental');
		expect(ics).toContain('LOCATION:Gymnase');
		expect(ics).toContain('DTSTART:20261115T083000Z');
		expect(ics).toContain('DTEND:20261115T091500Z');
		expect(ics).toContain('END:VEVENT');
	});
});
