import { describe, expect, test } from 'vitest';
import type { Profil } from '../../src/lib/auth';
import { elargissements, EXAMEN_PAR_THEME, lireParametres, parametresParDefaut } from '../../src/lib/data/parametres-seance';

const profil: Profil = {
	id: 'u1',
	prenom: 'Camille',
	nom: 'Martin',
	role: 'stagiaire',
	profil_formation: 'marqueur',
	niveau_id: 'niv-2',
	notice_acceptee_le: '2026-10-01T00:00:00Z'
};

describe('lireParametres : rôle', () => {
	test('?role=arbitre force le rôle, ?role=tous l’enlève, sinon celui du profil', () => {
		const url = (q: string) => ({ searchParams: new URLSearchParams(q) });
		expect(lireParametres(url('role=arbitre'), profil).role).toBe('arbitre');
		expect(lireParametres(url('role=tous'), profil).role).toBeNull();
		expect(lireParametres(url('role=autre'), profil).role).toBe('marqueur');
	});
});

describe('parametresParDefaut', () => {
	test('pédagogique : 20 questions, sans durée, niveau et rôle du profil', () => {
		expect(parametresParDefaut(profil, 'pedagogique')).toEqual({
			type: 'pedagogique',
			themeIds: [],
			regleId: null,
			niveauId: 'niv-2',
			role: 'marqueur',
			nb: 20,
			dureeMinutes: null
		});
	});

	test('examen d’entraînement : 30 questions, 45 minutes', () => {
		expect(parametresParDefaut(profil, 'examen_entrainement')).toMatchObject({ nb: 30, dureeMinutes: 45 });
	});
});

describe('lireParametres', () => {
	test('préremplit thème(s), règle et mode depuis l’URL', () => {
		const p = lireParametres(new URL('http://x/entrainement/nouvelle?theme=t1&theme=t2&regle=r9&mode=examen_entrainement'), profil);
		expect(p).toMatchObject({ type: 'examen_entrainement', themeIds: ['t1', 't2'], regleId: 'r9', nb: 30, dureeMinutes: 45 });
	});

	test('sur une règle précise, le niveau n’est pas filtré (toutes les questions de la règle)', () => {
		expect(lireParametres(new URL('http://x/?regle=r9'), profil).niveauId).toBeNull();
	});

	test('nb est borné entre 5 et 50', () => {
		expect(lireParametres(new URL('http://x/?nb=2'), profil).nb).toBe(5);
		expect(lireParametres(new URL('http://x/?nb=500'), profil).nb).toBe(50);
		expect(lireParametres(new URL('http://x/?nb=abc'), profil).nb).toBe(20);
	});

	test('un mode inconnu retombe sur pédagogique', () => {
		expect(lireParametres(new URL('http://x/?mode=n-importe'), profil).type).toBe('pedagogique');
	});
});

describe('examen blanc par thème', () => {
	test('?format=theme : examen de 10 questions en 15 minutes sur un seul thème', () => {
		const p = lireParametres(new URL('http://x/?format=theme&theme=t1&theme=t2'), profil);
		expect(p).toMatchObject({ type: 'examen_entrainement', themeIds: ['t1'], nb: 10, dureeMinutes: 15 });
		expect(EXAMEN_PAR_THEME).toEqual({ nb: 10, dureeMinutes: 15 });
	});

	test('?duree= règle la durée d’un examen, bornée entre 5 et 120 minutes', () => {
		expect(lireParametres(new URL('http://x/?mode=examen_entrainement&duree=20'), profil).dureeMinutes).toBe(20);
		expect(lireParametres(new URL('http://x/?mode=examen_entrainement&duree=500'), profil).dureeMinutes).toBe(120);
		expect(lireParametres(new URL('http://x/?duree=20'), profil).dureeMinutes).toBeNull();
	});
});

describe('elargissements', () => {
	test('ne propose que les filtres actifs, dans l’ordre', () => {
		const p = { ...parametresParDefaut(profil, 'pedagogique'), themeIds: ['t1'], regleId: 'r1' };
		const e = elargissements(p);
		expect(e.map((x) => x.libelle)).toEqual(['Tous les niveaux', 'Tous les thèmes', 'Arbitre et marqueur', 'Retirer le filtre de règle']);
		expect(e[1].appliquer(p).themeIds).toEqual([]);
		expect(e[3].appliquer(p).regleId).toBeNull();
		expect(elargissements({ ...p, niveauId: null, themeIds: [], role: null, regleId: null })).toEqual([]);
	});
});
