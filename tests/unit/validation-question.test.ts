import { describe, expect, test } from 'vitest';
import { normaliserVideo, validerFormulaire, type FormulaireQuestion } from '../../src/lib/formateur/validation-question';

const complet = (): FormulaireQuestion => ({
	enonce: 'Le Libéro… Quelle est votre décision ?',
	propositions: (['A', 'B', 'C', 'D'] as const).map((lettre) => ({ lettre, texte: `Réponse ${lettre}` })),
	bonne: 'B',
	explication: 'Parce que.',
	themeId: 't1',
	niveauId: 'n2',
	roleCible: 'arbitre',
	usage: 'entrainement',
	videoUrl: '',
	regles: [{ id: 'r1', principale: true }]
});

describe('validerFormulaire', () => {
	test('un formulaire complet ne produit aucune erreur', () => {
		expect(validerFormulaire(complet())).toEqual({});
	});

	test('messages exacts pour chaque champ manquant', () => {
		const f = complet();
		f.enonce = ' ';
		f.propositions[2].texte = '';
		f.bonne = null;
		f.explication = '';
		f.themeId = null;
		f.niveauId = null;
		f.regles = [];
		expect(validerFormulaire(f)).toEqual({
			enonce: 'Rédigez l’énoncé.',
			propositions: 'Remplissez les 4 propositions.',
			bonne: 'Choisissez la bonne réponse.',
			explication: 'Rédigez l’explication.',
			theme: 'Choisissez un thème.',
			niveau: 'Choisissez un niveau.',
			regles: 'Liez au moins une règle.'
		});
	});

	test('une seule règle principale', () => {
		const f = complet();
		f.regles = [{ id: 'r1', principale: true }, { id: 'r2', principale: true }];
		expect(validerFormulaire(f).regles).toBe('Une seule règle principale.');
		f.regles = [{ id: 'r1', principale: false }];
		expect(validerFormulaire(f).regles).toBe('Une seule règle principale.');
	});

	test('lien vidéo non reconnu', () => {
		const f = complet();
		f.videoUrl = 'https://exemple.com/video';
		expect(validerFormulaire(f).video).toBe('Lien vidéo non reconnu (YouTube ou FIVB Academy).');
	});
});

describe('normaliserVideo', () => {
	test('youtu.be et youtube.com deviennent un lecteur youtube-nocookie', () => {
		expect(normaliserVideo('https://youtu.be/abc123')).toBe('https://www.youtube-nocookie.com/embed/abc123');
		expect(normaliserVideo('https://www.youtube.com/watch?v=abc123&t=4s')).toBe('https://www.youtube-nocookie.com/embed/abc123');
	});

	test('les vidéos FIVB Academy (.mp4) sont gardées telles quelles', () => {
		const u = 'http://www.fivbacademy.com/FIVB_elearning/casebook_2025/case%203.35.1.mp4';
		expect(normaliserVideo(u)).toBe(u);
	});

	test('vide → null ; autre site → null', () => {
		expect(normaliserVideo('  ')).toBeNull();
		expect(normaliserVideo('https://vimeo.com/1')).toBeNull();
		expect(normaliserVideo('pas une url')).toBeNull();
	});
});
