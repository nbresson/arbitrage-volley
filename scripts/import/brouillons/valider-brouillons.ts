// Vérifie le fichier de brouillons de questions avant chargement en base.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { CasImport, EntreeBrouillon, Probleme, RegleImport } from '../../../src/lib/domain/types';

const ROLES = ['arbitre', 'marqueur', 'les_deux'];
const vide = (s: unknown) => typeof s !== 'string' || !s.trim();

export function validerBrouillons(entrees: EntreeBrouillon[], cas: CasImport[], regles: RegleImport[]): Probleme[] {
	const problemes: Probleme[] = [];
	const refsCas = new Set(cas.map((c) => c.reference));
	const refsRegles = new Set(regles.map((r) => r.reference));
	const vus = new Set<string>();
	const erreur = (c: string, message: string) => problemes.push({ cas: c, gravite: 'erreur', message });
	const avert = (c: string, message: string) => problemes.push({ cas: c, gravite: 'avertissement', message });

	for (const e of entrees) {
		if (!refsCas.has(e.cas)) erreur(e.cas, 'Cas inconnu dans le Casebook.');
		if (vus.has(e.cas)) erreur(e.cas, 'Cas traité plusieurs fois.');
		vus.add(e.cas);

		if ('sans_question' in e) {
			if (vide(e.raison)) erreur(e.cas, 'Raison manquante.');
			continue;
		}

		const lettres = e.propositions.map((p) => p.lettre).join('');
		if (lettres !== 'ABCD') erreur(e.cas, 'Il faut 4 propositions A, B, C, D.');
		if (e.propositions.filter((p) => p.correcte).length !== 1) erreur(e.cas, 'Il faut exactement une bonne réponse.');
		if (e.propositions.some((p) => vide(p.texte))) erreur(e.cas, 'Une proposition est vide.');
		if (vide(e.enonce)) erreur(e.cas, "L'énoncé est vide.");
		if (vide(e.explication)) erreur(e.cas, "L'explication est vide.");
		if (vide(e.theme)) erreur(e.cas, 'Le thème est vide.');
		if (vide(e.niveau)) erreur(e.cas, 'Le niveau est vide.');
		if (!ROLES.includes(e.role_cible)) erreur(e.cas, 'Rôle cible inconnu.');
		if (!e.regles.includes(e.regle_principale)) erreur(e.cas, 'La règle principale doit faire partie des règles liées.');
		for (const r of e.regles) {
			if (!refsRegles.has(r) && !refsCas.has(r)) avert(e.cas, `Référence non liable : ${r}`);
		}
	}

	for (const c of cas) if (!vus.has(c.reference)) avert(c.reference, 'Cas non traité.');
	return problemes;
}

// Utilisation : npx tsx scripts/import/brouillons/valider-brouillons.ts [brouillons.json]
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const fichier = process.argv[2] ?? 'data/brouillons-casebook-2025.json';
	const lire = <T>(f: string): T => JSON.parse(readFileSync(f, 'utf8'));
	const problemes = validerBrouillons(
		lire<EntreeBrouillon[]>(fichier),
		lire<CasImport[]>('data/casebook-2025.json'),
		lire<RegleImport[]>('data/regles-2025-2028.json')
	);
	const nonTraites = problemes.filter((p) => p.message === 'Cas non traité.');
	for (const p of problemes) if (p.message !== 'Cas non traité.') console.log(`${p.gravite.toUpperCase()} ${p.cas} : ${p.message}`);
	if (nonTraites.length) console.log(`AVERTISSEMENT ${nonTraites.length} cas non traités`);
	const nbErreurs = problemes.filter((p) => p.gravite === 'erreur').length;
	console.log(`${nbErreurs} erreur(s)`);
	process.exit(nbErreurs ? 1 : 0);
}
