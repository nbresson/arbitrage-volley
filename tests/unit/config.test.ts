// Le nom du comité et l'adresse de contact vivent dans src/lib/config.ts, jamais en dur dans une page.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { CONTACT_EMAIL, lienContact, NOM_COMITE } from '../../src/lib/config';

const pages = (dossier: string): string[] =>
	readdirSync(dossier).flatMap((f) => {
		const p = join(dossier, f);
		return statSync(p).isDirectory() ? pages(p) : p.endsWith('.svelte') ? [p] : [];
	});

test('aucun texte provisoire codé en dur dans les pages', () => {
	for (const p of pages('src')) expect(readFileSync(p, 'utf8'), p).not.toMatch(/\[Comité\]|\[adresse de contact/);
});

test('le lien de contact est un mailto vers l’adresse configurée', () => {
	expect(NOM_COMITE.length).toBeGreaterThan(0);
	expect(lienContact).toBe(`mailto:${CONTACT_EMAIL}`);
});
