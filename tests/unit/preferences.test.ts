import { beforeEach, describe, expect, test, vi } from 'vitest';
import { animationsReduites, appliquerAffichage, enregistrerPreferences, lirePreferences } from '../../src/lib/preferences';

beforeEach(() => {
	localStorage.clear();
	for (const a of ['theme', 'taille', 'animations', 'contraste']) delete document.documentElement.dataset[a];
});

describe('préférences d’affichage', () => {
	test('valeurs par défaut : thème automatique, texte normal, animations du système, contraste normal', () => {
		expect(lirePreferences()).toMatchObject({ theme: 'auto', taille: 'normale', animations: 'systeme', contraste: 'normal' });
	});

	test('appliquées comme attributs de la page ; « auto » ne pose rien', () => {
		appliquerAffichage(enregistrerPreferences({ theme: 'sombre', taille: 'grande', animations: 'reduites', contraste: 'eleve' }));
		expect(document.documentElement.dataset).toMatchObject({ theme: 'sombre', taille: 'grande', animations: 'reduites', contraste: 'eleve' });
		appliquerAffichage(enregistrerPreferences({ theme: 'auto', taille: 'normale', animations: 'systeme', contraste: 'normal' }));
		expect(document.documentElement.dataset.theme).toBeUndefined();
		expect(document.documentElement.dataset.taille).toBeUndefined();
		expect(document.documentElement.dataset.animations).toBeUndefined();
		expect(document.documentElement.dataset.contraste).toBeUndefined();
	});

	test('animations réduites : par la préférence ou par le système', () => {
		window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
		expect(animationsReduites()).toBe(false);
		enregistrerPreferences({ animations: 'reduites' });
		expect(animationsReduites()).toBe(true);
		enregistrerPreferences({ animations: 'systeme' });
		window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
		expect(animationsReduites()).toBe(true);
	});
});
