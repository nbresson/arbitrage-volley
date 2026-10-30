// Cibles tactiles : chaque contrôle relevé par la revue UX déclare au moins 44 px de haut.
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const CIBLES: [string, string[]][] = [
	['src/routes/entrainement/[seance]/+page.svelte', ['.marque', '.quitter', '.lien-raccourcis']],
	['src/lib/components/SourcesOnglets.svelte', ['.onglets button']],
	['src/lib/components/GrilleQuestions.svelte', ['.case']],
	['src/lib/components/PassationExamen.svelte', ['.fermer']],
	['src/lib/components/Bandeau.svelte', ['.themes label', '.menu > a']],
	['src/routes/preferences/+page.svelte', ['.option']],
	['src/routes/+page.svelte', ['.pastilles button', '.tri select', '.objectif select']],
	['src/routes/formateur/glossaire/+page.svelte', ['.lien']],
	['src/routes/formateur/regles/+page.svelte', ['.lien-ed', '.import summary']],
	['src/routes/formateur/questions/[id]/+page.svelte', ['.bonne']]
];

/** Le premier bloc de règles dont le sélecteur est exactement `selecteur` (hors media query imbriquée). */
function bloc(css: string, selecteur: string): string {
	const echappe = selecteur.replace(/[.*+?^${}()|[\]\>]/g, '\$&');
	const m = new RegExp(`(?:^|\n)\t${echappe} \{([^}]*)\}`).exec(css);
	if (!m) throw new Error(`sélecteur introuvable : ${selecteur}`);
	return m[1];
}

for (const [fichier, selecteurs] of CIBLES) {
	for (const s of selecteurs) {
		test(`${fichier} ${s} : 44 px au moins`, () => {
			const b = bloc(readFileSync(fichier, 'utf8'), s);
			const hauteur = /(?:min-)?height:\s*(\d+)px/.exec(b);
			expect(b, s).toMatch(/min-height:\s*44px/);
			if (hauteur) expect(Number(hauteur[1])).toBeGreaterThanOrEqual(44);
		});
	}
}
