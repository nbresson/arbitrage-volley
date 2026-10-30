import { describe, expect, test } from 'vitest';
import { avertissementsQualite, doublons, fileRelecture, positionRelecture, similarite, statsParTheme, trierBanque } from '../../src/lib/formateur/banque';

const q = (id: string, o: Partial<{ enonce: string; statut: string; usage: string; theme: string | null; reference_origine: string | null }> = {}) => ({
	id,
	enonce: o.enonce ?? `Énoncé ${id}`,
	statut: (o.statut ?? 'brouillon') as 'brouillon' | 'validee' | 'archivee',
	usage: (o.usage ?? 'entrainement') as 'entrainement' | 'reserve_examen',
	theme: o.theme === undefined ? 'Service' : o.theme,
	reference_origine: o.reference_origine ?? null
});

describe('file de relecture', () => {
	const qs = [q('a', { reference_origine: 'Cas 3.10' }), q('b', { reference_origine: 'Cas 3.9' }), q('c', { statut: 'validee' }), q('d', { reference_origine: null })];
	test('les brouillons, dans l’ordre du Casebook, les rédigés à la fin', () => {
		expect(fileRelecture(qs)).toEqual(['b', 'a', 'd']);
	});
	test('position : rang, total, suivant', () => {
		expect(positionRelecture(['b', 'a', 'd'], 'a')).toEqual({ rang: 2, total: 3, suivant: 'd' });
		expect(positionRelecture(['b', 'a', 'd'], 'd')).toEqual({ rang: 3, total: 3, suivant: null });
		expect(positionRelecture(['b', 'a', 'd'], 'z')).toBeNull();
	});
});

describe('doublons', () => {
	test('similarité des mots, sans accents ni petits mots', () => {
		expect(similarite('Le libéro peut-il servir ?', 'Le libero peut il servir')).toBe(1);
		expect(similarite('Le libéro peut-il servir ?', 'Le capitaine demande un temps mort')).toBeLessThan(0.2);
	});
	test('énoncés très proches signalés, la question elle-même exclue', () => {
		const qs = [q('a', { enonce: 'Le libéro peut-il servir pendant le match ?' }), q('b', { enonce: 'Le capitaine demande un temps mort.' })];
		expect(doublons('Le libéro peut il servir pendant ce match ?', qs, null).map((x) => x.id)).toEqual(['a']);
		expect(doublons('Le libéro peut-il servir pendant le match ?', qs, 'a')).toEqual([]);
	});
});

describe('vérificateur de qualité', () => {
	const base = {
		enonce: 'Le libéro peut-il servir ?',
		explication: 'Non : la règle 19.3.1.2 interdit au libéro de servir, quelle que soit sa position.',
		bonne: 'B' as const,
		propositions: [
			{ lettre: 'A' as const, texte: 'Oui, toujours' },
			{ lettre: 'B' as const, texte: 'Non, jamais' },
			{ lettre: 'C' as const, texte: 'Oui, en fin de set' },
			{ lettre: 'D' as const, texte: 'Seulement au tie-break' }
		]
	};
	test('rien à signaler', () => {
		expect(avertissementsQualite(base)).toEqual([]);
	});
	test('énoncé trop long, propositions identiques, bonne réponse trop visible, explication trop courte', () => {
		const a = avertissementsQualite({
			...base,
			enonce: 'x'.repeat(420),
			explication: 'Non.',
			propositions: [
				{ lettre: 'A', texte: 'Oui, toujours' },
				{ lettre: 'B', texte: 'Non, jamais, car la règle interdit formellement au libéro de servir quelle que soit la situation' },
				{ lettre: 'C', texte: 'oui toujours' },
				{ lettre: 'D', texte: 'Seulement au tie-break' }
			]
		});
		expect(a).toEqual([
			'Énoncé long (420 caractères) : peut-on le raccourcir ?',
			'Les propositions A et C se ressemblent beaucoup.',
			'La bonne réponse est bien plus longue que les autres : elle se devine.',
			'Explication très courte : citez la règle et dites pourquoi.'
		]);
	});
});

describe('banque', () => {
	const qs = [
		q('a', { theme: 'Service', statut: 'validee' }),
		q('b', { theme: 'Service', statut: 'brouillon' }),
		q('c', { theme: 'Contre', statut: 'validee', usage: 'reserve_examen' }),
		q('d', { theme: null, statut: 'archivee' })
	];
	test('statistiques par thème', () => {
		expect(statsParTheme(qs)).toEqual([
			{ theme: 'Contre', validees: 0, reserve: 1, brouillons: 0, archivees: 0 },
			{ theme: 'Service', validees: 1, reserve: 0, brouillons: 1, archivees: 0 },
			{ theme: 'Sans thème', validees: 0, reserve: 0, brouillons: 0, archivees: 1 }
		]);
	});
	test('tri par thème, par taux de réussite (les plus ratées d’abord, sans réponses à la fin)', () => {
		expect(trierBanque(qs, 'theme', new Map()).map((x) => x.id)).toEqual(['c', 'a', 'b', 'd']);
		const taux = new Map([['a', { reponses: 10, justes: 9 }], ['b', { reponses: 4, justes: 1 }]]);
		expect(trierBanque(qs, 'reussite', taux).map((x) => x.id)).toEqual(['b', 'a', 'c', 'd']);
		expect(trierBanque(qs, 'modification', taux).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
	});
});
