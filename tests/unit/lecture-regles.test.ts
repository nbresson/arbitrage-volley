import { describe, expect, test } from 'vitest';
import type { Regle } from '../../src/lib/regles/arbre';
import { chapitre, cleFigure, comptesParSource, vueDeSource, extrait, rechercheActive, segmentsGlossaire, segmentsSurlignes, voisines } from '../../src/lib/regles/lecture';

const r = (reference: string, parent_reference: string | null, texte = '', edition = 'Règles'): Regle => ({
	id: reference,
	edition,
	source: 'fivb_regles',
	reference,
	parent_reference,
	titre: null,
	texte,
	texte_original: null,
	renvois: [],
	video_url: null
});

describe('rechercheActive', () => {
	test('dès deux lettres, ou dès un chiffre de numéro', () => {
		expect(rechercheActive('l')).toBe(false);
		expect(rechercheActive(' li ')).toBe(true);
		expect(rechercheActive('7')).toBe(true);
		expect(rechercheActive('Cas 3')).toBe(true);
	});
});

describe('segmentsSurlignes', () => {
	test('surligne chaque mot cherché, sans tenir compte des accents ni des majuscules', () => {
		expect(segmentsSurlignes('Le libéro peut remplacer', 'LIBERO rempl')).toEqual([
			{ texte: 'Le ', marque: false },
			{ texte: 'libéro', marque: true },
			{ texte: ' peut ', marque: false },
			{ texte: 'rempl', marque: true },
			{ texte: 'acer', marque: false }
		]);
	});
	test('un numéro ou un mot d’une lettre ne surligne rien', () => {
		expect(segmentsSurlignes('Règle 12.4', '12.4')).toEqual([{ texte: 'Règle 12.4', marque: false }]);
		expect(segmentsSurlignes('a b', 'a')).toEqual([{ texte: 'a b', marque: false }]);
	});
});

describe('extrait', () => {
	const long = `${'début '.repeat(30)}le libéro entre en jeu ${'suite '.repeat(30)}`;
	test('centré sur le premier mot trouvé, avec des points de suspension', () => {
		const e = extrait(long, 'libero', 60);
		expect(e).toContain('libéro');
		expect(e.startsWith('…')).toBe(true);
		expect(e.endsWith('…')).toBe(true);
		expect(e.length).toBeLessThanOrEqual(62);
	});
	test('sans mot trouvé : le début du texte', () => {
		expect(extrait('Texte court', 'zzz', 60)).toBe('Texte court');
	});
});

describe('voisines', () => {
	const edition = [r('2', null), r('1.2', '1'), r('1', null), r('1.1', '1')];
	test('précédente et suivante dans l’ordre du règlement', () => {
		expect(voisines(edition, edition[3])).toEqual({ precedente: edition[2], suivante: edition[1] });
		expect(voisines(edition, edition[2]).precedente).toBeNull();
		expect(voisines(edition, edition[0]).suivante).toBeNull();
	});
});

describe('chapitre', () => {
	const edition = [r('21', null), r('21.1', '21'), r('21.3', '21'), r('21.3.1', '21.3'), r('22', null)];
	test('le chapitre de la règle, à plat avec la profondeur', () => {
		expect(chapitre(edition, edition[3]).map((x) => [x.regle.reference, x.profondeur])).toEqual([
			['21', 0],
			['21.1', 1],
			['21.3', 1],
			['21.3.1', 2]
		]);
	});
});

describe('segmentsGlossaire', () => {
	const termes = [
		{ terme: 'libéro', definition: 'Joueur spécialiste de la défense.' },
		{ terme: 'rotation', definition: 'Déplacement des joueurs.' }
	];
	test('la première occurrence de chaque terme, mot entier, sans tenir compte des majuscules', () => {
		expect(segmentsGlossaire('Le Libéro et le libéro ; la rotationnelle', termes)).toEqual([
			{ texte: 'Le ' },
			{ texte: 'Libéro', definition: 'Joueur spécialiste de la défense.' },
			{ texte: ' et le libéro ; la rotationnelle' }
		]);
	});
	test('sans terme : le texte entier', () => {
		expect(segmentsGlossaire('Texte', [])).toEqual([{ texte: 'Texte' }]);
	});
});

describe('cleFigure', () => {
	test('reconnaît une figure et son détail', () => {
		expect(cleFigure('Fig.9')).toEqual({ reference: 'Fig.9', detail: null, libelle: 'Figure 9' });
		expect(cleFigure('Fig.11 (15)')).toEqual({ reference: 'Fig.11', detail: '15', libelle: 'Figure 11, n° 15' });
		expect(cleFigure('12.4')).toBeNull();
	});
});

describe('sources et vues', () => {
	test('comptesParSource', () => {
		const rs = [r('1', null), { ...r('Cas 3.35', null), source: 'casebook' as const }, { ...r('Cas 3.36', null), source: 'casebook' as const }];
		expect(comptesParSource(rs)).toEqual({ fivb_regles: 1, casebook: 2, cfa: 0 });
	});
	test('vue d’adresse de chaque source', () => {
		expect(vueDeSource('fivb_regles')).toBe('fivb');
		expect(vueDeSource('casebook')).toBe('casebook');
		expect(vueDeSource('cfa')).toBe('cfa');
	});
});
