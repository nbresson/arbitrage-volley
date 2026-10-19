import { describe, expect, test } from 'vitest';
import { garde, type Profil } from '../../src/lib/auth';

const profil = (p: Partial<Profil> = {}): Profil => ({
	id: 'u1',
	prenom: 'Camille',
	nom: 'Martin',
	role: 'stagiaire',
	profil_formation: 'arbitre',
	niveau_id: 'n2',
	notice_acceptee_le: '2026-10-01T10:00:00Z',
	actif: true,
	...p
});

describe('garde', () => {
	test('sans session : vers /connexion', () => {
		expect(garde(null, '/')).toBe('/connexion');
		expect(garde(null, '/regles')).toBe('/connexion');
	});

	test('les pages publiques restent accessibles sans session', () => {
		expect(garde(null, '/connexion')).toBeNull();
		expect(garde(null, '/mot-de-passe')).toBeNull();
	});

	test('notice non acceptée : vers /notice', () => {
		expect(garde(profil({ notice_acceptee_le: null }), '/')).toBe('/notice');
		expect(garde(profil({ notice_acceptee_le: null }), '/notice')).toBeNull();
	});

	test('un stagiaire ne va pas dans l’espace formateur', () => {
		expect(garde(profil(), '/formateur/questions')).toBe('/');
	});

	test('un formateur accède à son espace', () => {
		expect(garde(profil({ role: 'formateur' }), '/formateur/questions')).toBeNull();
	});

	test('connecté sur /connexion : vers l’accueil', () => {
		expect(garde(profil(), '/connexion')).toBe('/');
	});

	test('cas nominal : pas de redirection', () => {
		expect(garde(profil(), '/entrainement/nouvelle')).toBeNull();
	});
});

describe('garde : corrections de la revue', () => {
	test('un invité arrivant par son lien choisit d’abord son mot de passe, avant la notice', () => {
		expect(garde(profil({ notice_acceptee_le: null }), '/mot-de-passe')).toBeNull();
	});

	test('un compte désactivé est dirigé vers la page qui l’en informe', () => {
		expect(garde(profil({ actif: false }), '/')).toBe('/compte-desactive');
		expect(garde(profil({ actif: false }), '/compte-desactive')).toBeNull();
		expect(garde(profil({ actif: true }), '/compte-desactive')).toBe('/');
	});
});
