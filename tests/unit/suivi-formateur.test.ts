import { describe, expect, test } from 'vitest';
import { analyserListe, csvResultats, filtrerComptes, ilYa, listeControle, themesFaibles, trierComptes } from '../../src/lib/formateur/suivi';

describe('analyserListe (import de comptes)', () => {
	test('une personne par ligne : prénom, nom, adresse, séparés par ; , ou tabulation', () => {
		expect(analyserListe('Camille;Martin;camille@exemple.fr\nLou, Durand, lou@exemple.fr\nAna\tRoy\tana@exemple.fr\n\n')).toEqual([
			{ prenom: 'Camille', nom: 'Martin', email: 'camille@exemple.fr', erreur: null },
			{ prenom: 'Lou', nom: 'Durand', email: 'lou@exemple.fr', erreur: null },
			{ prenom: 'Ana', nom: 'Roy', email: 'ana@exemple.fr', erreur: null }
		]);
	});
	test('erreurs écrites ligne par ligne', () => {
		const l = analyserListe('Camille;Martin\nLou;Durand;pas-une-adresse\nAna;Roy;ana@exemple.fr\nAna;Roy;ANA@exemple.fr');
		expect(l.map((x) => x.erreur)).toEqual([
			'Il manque une information : prénom ; nom ; adresse e-mail.',
			'Adresse e-mail invalide.',
			null,
			'Adresse en double dans la liste.'
		]);
	});
	test('une ligne d’en-tête est ignorée', () => {
		expect(analyserListe('prénom;nom;email\nCamille;Martin;c@exemple.fr')).toHaveLength(1);
	});
});

const comptes = [
	{ id: '1', prenom: 'Lou', nom: 'Durand', niveau_id: 'n2', promotion: 'Automne' },
	{ id: '2', prenom: 'Ana', nom: 'Roy', niveau_id: 'n1', promotion: null },
	{ id: '3', prenom: 'Camille', nom: 'Martin', niveau_id: 'n1', promotion: 'Automne' }
];

describe('tri et recherche des comptes', () => {
	const contexte = { niveaux: new Map([['n1', 1], ['n2', 2]]), reussite: new Map([['1', 80], ['3', 40]]) };
	test('par nom, par niveau, par réussite (sans données en tête, puis les plus faibles)', () => {
		expect(trierComptes(comptes, 'nom', contexte).map((c) => c.id)).toEqual(['1', '3', '2']);
		expect(trierComptes(comptes, 'niveau', contexte).map((c) => c.id)).toEqual(['3', '2', '1']);
		expect(trierComptes(comptes, 'reussite', contexte).map((c) => c.id)).toEqual(['2', '3', '1']);
	});
	test('recherche par nom ou prénom sans accents, filtre par promotion', () => {
		expect(filtrerComptes(comptes, 'cami', '').map((c) => c.id)).toEqual(['3']);
		expect(filtrerComptes(comptes, '', 'Automne').map((c) => c.id)).toEqual(['1', '3']);
		expect(filtrerComptes(comptes, '', '(sans)').map((c) => c.id)).toEqual(['2']);
	});
});

describe('fiche', () => {
	const maintenant = new Date('2026-10-30T12:00:00Z');
	test('dernière activité en mots', () => {
		expect(ilYa(null, maintenant)).toBe('aucune activité');
		expect(ilYa('2026-10-30T08:00:00Z', maintenant)).toBe('aujourd’hui');
		expect(ilYa('2026-10-29T08:00:00Z', maintenant)).toBe('hier');
		expect(ilYa('2026-10-25T08:00:00Z', maintenant)).toBe('il y a 5 jours');
	});
	test('thèmes faibles : les plus à revoir d’abord, trois au plus', () => {
		const av = [
			{ theme_id: 'a', theme: 'Service', ordre: 1, total: 10, acquises: 8, a_revoir: 2 },
			{ theme_id: 'b', theme: 'Libéro', ordre: 2, total: 4, acquises: 0, a_revoir: 3 },
			{ theme_id: 'c', theme: 'Filet', ordre: 3, total: 5, acquises: 5, a_revoir: 0 },
			{ theme_id: 'd', theme: 'Contre', ordre: 4, total: 6, acquises: 3, a_revoir: 3 },
			{ theme_id: 'e', theme: 'Rotation', ordre: 5, total: 10, acquises: 9, a_revoir: 1 }
		];
		expect(themesFaibles(av).map((t) => t.theme)).toEqual(['Libéro', 'Contre', 'Service']);
	});
});

describe('liste de contrôle avant ouverture', () => {
	test('tout est prêt', () => {
		const l = listeControle({ nbQuestions: 30, inscrits: 4, seuil: 21, lieu: 'Salle 2' });
		expect(l.pret).toBe(true);
		expect(l.points.every((p) => p.ok)).toBe(true);
	});
	test('ce qui manque est écrit', () => {
		const l = listeControle({ nbQuestions: 0, inscrits: 0, seuil: null, lieu: '' });
		expect(l.pret).toBe(false);
		expect(l.points.filter((p) => !p.ok).map((p) => p.libelle)).toEqual(['Questions choisies', 'Stagiaires inscrits', 'Seuil de réussite', 'Lieu indiqué']);
	});
	test('le lieu manquant n’empêche pas l’ouverture', () => {
		expect(listeControle({ nbQuestions: 5, inscrits: 1, seuil: 3, lieu: '' }).pret).toBe(true);
	});
});

test('export CSV des résultats : séparateur point-virgule, lisible par un tableur français', () => {
	const csv = csvResultats([
		{ prenom: 'Lou', nom: 'Durand', etat: 'termine', score: 24, total: 30, reussi: true, sorties: 0 },
		{ prenom: 'Ana', nom: 'Roy; fils', etat: 'absent', score: null, total: null, reussi: null, sorties: 0 }
	]);
	expect(csv.startsWith('﻿Nom;Prénom;État;Score;Sur;Résultat;Sorties d’écran\r\n')).toBe(true);
	expect(csv).toContain('Durand;Lou;Terminé;24;30;Réussi;0\r\n');
	expect(csv).toContain('"Roy; fils";Ana;Absent;;;;0');
});

test('sans séance : en tête du tri par réussite ; formateurs à la fin', () => {
	const liste = [
		{ id: 'f', prenom: 'Ana', nom: 'Formatrice', niveau_id: null, role: 'formateur' as const },
		{ id: 'a', prenom: 'Lou', nom: 'Actif', niveau_id: null, role: 'stagiaire' as const },
		{ id: 'z', prenom: 'Zoé', nom: 'Inactive', niveau_id: null, role: 'stagiaire' as const }
	];
	const ordre = trierComptes(liste, 'reussite', { niveaux: new Map(), reussite: new Map([['a', 90]]) }).map((c) => c.id);
	expect(ordre).toEqual(['z', 'a', 'f']);
});
