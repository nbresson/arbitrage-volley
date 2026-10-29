import { expect, test } from 'vitest';
import { iconeTheme } from '../../src/lib/domain/icone-theme.ts';

test('chaque thème connu a son pictogramme', () => {
	expect(iconeTheme('Service')).toBe('service');
	expect(iconeTheme('Joueur au filet')).toBe('filet');
	expect(iconeTheme('Pénétration sous le filet')).toBe('filet');
	expect(iconeTheme('Fautes de position et de rotation')).toBe('rotation');
	expect(iconeTheme('Remplacements')).toBe('remplacement');
	expect(iconeTheme('Temps-morts')).toBe('temps-mort');
	expect(iconeTheme('Retards de jeu')).toBe('chrono');
	expect(iconeTheme('Conduite des participants')).toBe('carton');
	expect(iconeTheme('Le Libéro')).toBe('maillot');
	expect(iconeTheme("L'uniforme")).toBe('maillot');
	expect(iconeTheme("Cas d'utilisation de la technologie")).toBe('ecran');
	expect(iconeTheme('Blessures')).toBe('blessure');
	expect(iconeTheme('Les arbitres et leurs responsabilités')).toBe('sifflet');
	expect(iconeTheme('Contre')).toBe('contre');
	expect(iconeTheme("Frappe d'attaque")).toBe('attaque');
});

test('un thème inconnu prend le ballon', () => {
	expect(iconeTheme('Nouveau thème')).toBe('ballon');
	expect(iconeTheme(null)).toBe('ballon');
});
