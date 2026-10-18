import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parseRegles } from '../../scripts/import/regles/parse-regles';

const fixture = readFileSync('tests/fixtures/regles-extrait.txt', 'utf8');
const regles = parseRegles(fixture);
const trouver = (ref: string) => {
	const r = regles.find((x) => x.reference === ref);
	if (!r) throw new Error(`règle ${ref} absente`);
	return r;
};

describe('parseRegles', () => {
	test("19.3.1.4 : texte complet, sans bruit de page ni renvois", () => {
		const r = trouver('19.3.1.4');
		expect(r.parent_reference).toBe('19.3.1');
		expect(r.texte).toMatch(
			/^Un joueur ne peut effectuer une frappe d’attaque quand le ballon est complètement plus haut/
		);
		expect(r.texte).toMatch(/en dehors de sa zone avant\.$/);
		expect(r.texte).not.toMatch(/PARTIE 2|\b42\b|1\.4\.1|Fig\./);
	});

	test('19.3.1.4 : renvois de la colonne de droite, « d, e » développé', () => {
		expect(trouver('19.3.1.4').renvois).toEqual(['1.4.1', '13.3.6', '23.3.2.3d', '23.3.2.3e', 'Fig.1b']);
	});

	test('12.4.4 : texte exact et renvois', () => {
		const r = trouver('12.4.4');
		expect(r.texte).toBe(
			'Le joueur au service doit frapper le ballon au cours des 8 secondes qui suivent le coup de sifflet du premier arbitre.'
		);
		expect(r.renvois).toEqual(['12.3', 'Fig.11 (11)']);
	});

	test('un numéro de page isolé ne passe pas dans le texte', () => {
		expect(trouver('7.5.2').texte).toBe(
			'Si le joueur au service commet une faute de service au moment de frapper le ballon, sa faute prévaudra sur une faute de position.'
		);
		expect(trouver('7.5.2').renvois).toEqual(['12.4', '12.7.1']);
	});

	test('titre en capitales, renvois en fin de ligne de titre', () => {
		expect(trouver('15.2').titre).toBe('SÉQUENCE D’INTERRUPTION DE JEU RÈGLEMENTAIRE');
		expect(trouver('7.5').titre).toBe('FAUTE DE POSITION');
		expect(trouver('7.5').renvois).toEqual(['Fig.4', 'Fig.11 (13)']);
		expect(trouver('12.5').titre).toBe('ÉCRAN');
		expect(trouver('12.5').renvois).toEqual(['Fig.6', 'Fig.11']);
		expect(trouver('19').titre).toBe('LE JOUEUR LIBÉRO');
		expect(trouver('19.3.1').titre).toBe('Les actions de jeu');
	});

	test('renvois collés en fin de ligne de texte', () => {
		const r = trouver('19.3.1.1');
		expect(r.texte).toBe('le Libéro peut remplacer n’importe quel joueur de la ligne arrière;');
		expect(r.renvois).toEqual(['7.4.1.2']);
		expect(trouver('19.3.1.3').renvois).toEqual(['12.4.1', '14.6.2', '14.6.6', 'Fig.11 (12)']);
	});

	test('les encadrés de marge (« Chapitre 6 », « Voir Règles ») sont ignorés', () => {
		expect(trouver('18.2').texte).toBe('Le dernier article avant le chapitre du libéro.');
	});

	test("une ligne de texte commençant par un nombre n'est pas un article", () => {
		expect(regles.find((x) => x.reference === '1')).toBeUndefined();
		expect(trouver('19.3.2').texte).toMatch(/1 m à l’extérieur/);
	});

	test('la table des matières et les figures (SECTION 3) sont ignorées', () => {
		expect(regles.filter((x) => x.reference === '7.5')).toHaveLength(1);
		expect(regles.at(-1)!.reference).toBe('29.2.1.1');
	});

	test('figure à plusieurs numéros et renvoi « Chapitre N »', () => {
		expect(trouver('29.2.1.1').renvois).toEqual(['Fig.12 (1, 2)']);
		expect(trouver('29.2.1.1').texte).toMatch(/ligne\(s\);$/);
		expect(trouver('23.2.5').renvois).toEqual(['Chapitre 1']);
	});

	test('un mot coupé par un tiret en fin de ligne est recollé', () => {
		expect(trouver('23.2.5').texte).toBe(
			'vérifie si le ballon passe au-dessus du filet et si les conditions permettent de jouer.'
		);
	});

	test('pas de doublon, ordre croissant', () => {
		expect(new Set(regles.map((x) => x.reference)).size).toBe(regles.length);
		expect(regles.map((x) => x.ordre)).toEqual(regles.map((_, i) => i));
	});
});
