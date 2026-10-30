// Banque de questions côté formateur : file de relecture, doublons, qualité, statistiques, tris (fonctions pures).
import { comparerReferences } from '#lib/regles/arbre.ts';

type LigneBanque = {
	id: string;
	enonce: string;
	statut: 'brouillon' | 'validee' | 'archivee';
	usage: 'entrainement' | 'reserve_examen';
	theme: string | null;
	reference_origine: string | null;
};

/** Brouillons à relire, dans l'ordre du Casebook (les questions rédigées à la main à la fin). */
export function fileRelecture(questions: LigneBanque[]): string[] {
	return questions
		.filter((q) => q.statut === 'brouillon')
		.sort((a, b) => {
			if (!a.reference_origine !== !b.reference_origine) return a.reference_origine ? -1 : 1;
			return comparerReferences(a.reference_origine ?? '', b.reference_origine ?? '') || a.enonce.localeCompare(b.enonce, 'fr');
		})
		.map((q) => q.id);
}

export function positionRelecture(file: string[], id: string): { rang: number; total: number; suivant: string | null } | null {
	const i = file.indexOf(id);
	if (i < 0) return null;
	return { rang: i + 1, total: file.length, suivant: file[i + 1] ?? null };
}

const mots = (s: string) =>
	new Set(
		s
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((m) => m.length >= 3)
	);

/** Part de mots communs (indice de Jaccard), de 0 à 1. */
export function similarite(a: string, b: string): number {
	const ma = mots(a), mb = mots(b);
	if (!ma.size && !mb.size) return a.trim().toLowerCase() === b.trim().toLowerCase() ? 1 : 0;
	const communs = [...ma].filter((m) => mb.has(m)).length;
	return communs / (ma.size + mb.size - communs);
}

/** Énoncés très proches (≥ 75 % de mots communs), la question elle-même exclue ; trois au plus. */
export function doublons<T extends { id: string; enonce: string }>(enonce: string, questions: T[], idCourant: string | null): (T & { score: number })[] {
	if (mots(enonce).size < 3) return [];
	return questions
		.filter((q) => q.id !== idCourant)
		.map((q) => ({ ...q, score: similarite(enonce, q.enonce) }))
		.filter((q) => q.score >= 0.75)
		.sort((a, b) => b.score - a.score)
		.slice(0, 3);
}

type Brouillon = { enonce: string; explication: string; bonne: string | null; propositions: { lettre: string; texte: string }[] };

/** Points à vérifier avant de valider : ils n'empêchent pas la validation. */
export function avertissementsQualite(f: Brouillon): string[] {
	const a: string[] = [];
	const n = f.enonce.trim().length;
	if (n > 400) a.push(`Énoncé long (${n} caractères) : peut-on le raccourcir ?`);
	const ps = f.propositions.filter((p) => p.texte.trim());
	for (let i = 0; i < ps.length; i++) {
		for (let j = i + 1; j < ps.length; j++) {
			const egales = ps[i].texte.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim() === ps[j].texte.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
			if (egales || similarite(ps[i].texte, ps[j].texte) >= 0.85) a.push(`Les propositions ${ps[i].lettre} et ${ps[j].lettre} se ressemblent beaucoup.`);
		}
	}
	const bonne = ps.find((p) => p.lettre === f.bonne);
	const autres = ps.filter((p) => p.lettre !== f.bonne);
	if (bonne && autres.length) {
		const moyenne = autres.reduce((s, p) => s + p.texte.trim().length, 0) / autres.length;
		if (bonne.texte.trim().length > 40 && bonne.texte.trim().length > 1.8 * moyenne) a.push('La bonne réponse est bien plus longue que les autres : elle se devine.');
	}
	if (f.explication.trim() && f.explication.trim().length < 40) a.push('Explication très courte : citez la règle et dites pourquoi.');
	return a;
}

export type StatTheme = { theme: string; validees: number; reserve: number; brouillons: number; archivees: number };

/** Par thème : validées (entraînement), réserve d'examen, brouillons, archivées. */
export function statsParTheme(questions: LigneBanque[]): StatTheme[] {
	const parTheme = new Map<string, StatTheme>();
	for (const q of questions) {
		const theme = q.theme ?? 'Sans thème';
		const s = parTheme.get(theme) ?? { theme, validees: 0, reserve: 0, brouillons: 0, archivees: 0 };
		if (q.statut === 'brouillon') s.brouillons++;
		else if (q.statut === 'archivee') s.archivees++;
		else if (q.usage === 'reserve_examen') s.reserve++;
		else s.validees++;
		parTheme.set(theme, s);
	}
	return [...parTheme.values()].sort((a, b) => (a.theme === 'Sans thème' ? 1 : b.theme === 'Sans thème' ? -1 : a.theme.localeCompare(b.theme, 'fr')));
}

/** « modification » garde l'ordre reçu (dernière modification d'abord). */
export function trierBanque<T extends LigneBanque>(questions: T[], cle: 'modification' | 'theme' | 'reussite', taux: Map<string, { reponses: number; justes: number }>): T[] {
	const liste = [...questions];
	if (cle === 'theme') return liste.sort((a, b) => (a.theme ?? '￿').localeCompare(b.theme ?? '￿', 'fr'));
	if (cle === 'reussite') {
		const t = (q: T) => {
			const x = taux.get(q.id);
			return x?.reponses ? x.justes / x.reponses : Infinity;
		};
		return liste.sort((a, b) => t(a) - t(b));
	}
	return liste;
}
