import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('chaque couleur de DESIGN.md existe dans tokens.css avec la même valeur', () => {
	const design = readFileSync('DESIGN.md', 'utf8');
	const tokens = readFileSync('src/lib/styles/tokens.css', 'utf8');
	const attendus = [...design.matchAll(/`(--[a-z-]+)` (#[0-9A-F]{6})/g)];
	expect(attendus.length).toBeGreaterThanOrEqual(25);
	for (const [, nom, hex] of attendus) {
		expect(tokens, `${nom} ${hex}`).toMatch(new RegExp(`${nom}:\\s*${hex};`, 'i'));
	}
});
