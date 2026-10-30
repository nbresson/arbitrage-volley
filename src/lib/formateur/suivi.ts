// Suivi des stagiaires et des examens côté formateur : fonctions pures.
import type { Avancement } from '#lib/data/avancement.ts';

const plier = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type LigneImport = { prenom: string; nom: string; email: string; erreur: string | null };

/** Liste collée depuis un tableur ou un e-mail : « prénom ; nom ; adresse » par ligne (; , ou tabulation). */
export function analyserListe(texte: string): LigneImport[] {
	const vues = new Set<string>();
	return texte
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l && !/^pr[ée]nom\b/i.test(l))
		.map((l) => {
			const [prenom = '', nom = '', email = ''] = l.split(/[;,\t]/).map((x) => x.trim());
			let erreur: string | null = null;
			if (!prenom || !nom || !email) erreur = 'Il manque une information : prénom ; nom ; adresse e-mail.';
			else if (!EMAIL.test(email)) erreur = 'Adresse e-mail invalide.';
			else if (vues.has(email.toLowerCase())) erreur = 'Adresse en double dans la liste.';
			if (email) vues.add(email.toLowerCase());
			return { prenom, nom, email, erreur };
		});
}

type CompteTriable = { id: string; prenom: string; nom: string; niveau_id: string | null; promotion?: string | null; role?: 'stagiaire' | 'formateur' };

export function trierComptes<T extends CompteTriable>(
	comptes: T[],
	cle: 'nom' | 'niveau' | 'reussite',
	contexte: { niveaux: Map<string, number>; reussite: Map<string, number> }
): T[] {
	const nom = (c: T) => `${c.nom} ${c.prenom}`;
	const parNom = (a: T, b: T) => nom(a).localeCompare(nom(b), 'fr');
	return [...comptes].sort((a, b) => {
		// Les formateurs ferment toujours la liste : on cherche d'abord parmi les stagiaires.
		const fa = a.role === 'formateur' ? 1 : 0, fb = b.role === 'formateur' ? 1 : 0;
		if (fa !== fb) return fa - fb;
		if (cle === 'niveau') return (contexte.niveaux.get(a.niveau_id ?? '') ?? 99) - (contexte.niveaux.get(b.niveau_id ?? '') ?? 99) || parNom(a, b);
		if (cle === 'reussite') {
			// Sans séance : en tête, ce sont les stagiaires les plus à risque.
			const ra = contexte.reussite.get(a.id) ?? -1, rb = contexte.reussite.get(b.id) ?? -1;
			return ra - rb || parNom(a, b);
		}
		return parNom(a, b);
	});
}

/** Recherche dans le nom et le prénom ; promotion « (sans) » = comptes sans promotion. */
export function filtrerComptes<T extends CompteTriable>(comptes: T[], recherche: string, promotion: string): T[] {
	const q = plier(recherche.trim());
	return comptes.filter(
		(c) =>
			(!q || plier(`${c.prenom} ${c.nom}`).includes(q)) &&
			(!promotion || (promotion === '(sans)' ? !c.promotion : c.promotion === promotion))
	);
}

export function ilYa(iso: string | null, maintenant = new Date()): string {
	if (!iso) return 'aucune activité';
	const jour = (d: Date) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000);
	const n = jour(maintenant) - jour(new Date(iso));
	if (n <= 0) return 'aujourd’hui';
	if (n === 1) return 'hier';
	return `il y a ${n} jours`;
}

/** Les trois thèmes où la part de questions « à revoir » est la plus forte. */
export function themesFaibles(av: Avancement[]): Avancement[] {
	return av
		.filter((t) => t.a_revoir > 0)
		.sort((a, b) => b.a_revoir / (b.acquises + b.a_revoir) - a.a_revoir / (a.acquises + a.a_revoir) || b.a_revoir - a.a_revoir)
		.slice(0, 3);
}

/** Liste de contrôle avant l'ouverture d'un examen. Le lieu est conseillé, pas obligatoire. */
export function listeControle(e: { nbQuestions: number; inscrits: number; seuil: number | null; lieu: string }) {
	const points = [
		{ libelle: 'Questions choisies', ok: e.nbQuestions > 0, detail: e.nbQuestions ? `${e.nbQuestions} question${e.nbQuestions > 1 ? 's' : ''}` : 'aucune question', bloquant: true },
		{ libelle: 'Stagiaires inscrits', ok: e.inscrits > 0, detail: e.inscrits ? `${e.inscrits} inscrit${e.inscrits > 1 ? 's' : ''}` : 'personne', bloquant: true },
		{
			libelle: 'Seuil de réussite',
			ok: !!e.seuil && e.seuil <= e.nbQuestions,
			detail: e.seuil ? `${e.seuil} / ${e.nbQuestions}` : 'non fixé',
			bloquant: true
		},
		{ libelle: 'Lieu indiqué', ok: !!e.lieu.trim(), detail: e.lieu.trim() || 'conseillé pour la convocation', bloquant: false }
	];
	return { points, pret: points.every((p) => p.ok || !p.bloquant) };
}

const cellule = (v: string | number | null) => {
	const s = v === null ? '' : String(v);
	return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Résultats d'un examen en CSV (point-virgule, BOM UTF-8 : s'ouvre tel quel dans un tableur français). */
export function csvResultats(
	lignes: { prenom: string; nom: string; etat: 'absent' | 'en_cours' | 'termine'; score: number | null; total: number | null; reussi: boolean | null; sorties: number }[]
): string {
	const etats = { absent: 'Absent', en_cours: 'En cours', termine: 'Terminé' };
	const entete = ['Nom', 'Prénom', 'État', 'Score', 'Sur', 'Résultat', 'Sorties d’écran'];
	const corps = lignes.map((l) =>
		[l.nom, l.prenom, etats[l.etat], l.score, l.total, l.reussi === null ? '' : l.reussi ? 'Réussi' : 'Non réussi', l.sorties].map(cellule).join(';')
	);
	return `﻿${[entete.join(';'), ...corps].join('\r\n')}\r\n`;
}

/** Texte du dialogue « Clore l'examen » : qui compose encore, qui sera noté absent. */
export function texteCloture(r: { etat: 'absent' | 'en_cours' | 'termine' }[]): string {
	const enCours = r.filter((x) => x.etat === 'en_cours').length;
	const absents = r.filter((x) => x.etat === 'absent').length;
	if (!enCours && !absents) return 'Tous les stagiaires ont terminé.';
	const parties: string[] = [];
	if (enCours)
		parties.push(
			enCours > 1
				? `${enCours} stagiaires sont encore en cours (leurs réponses déjà envoyées seront gardées)`
				: '1 stagiaire est encore en cours (ses réponses déjà envoyées seront gardées)'
		);
	if (absents) parties.push(absents > 1 ? `${absents} n’ont pas commencé et seront notés absents` : '1 n’a pas commencé et sera noté absent');
	return `${parties.join(', ')}.`;
}

const jourLocal = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Liste des examens actifs : ouverts d'abord (à suivre en salle), puis brouillons du plus proche au plus lointain. */
export function ordreExamens<T extends { statut: 'brouillon' | 'ouvert' | 'clos'; date_heure: string }>(l: T[], _maintenant: Date = new Date()): T[] {
	return [...l].sort((a, b) => (a.statut === 'ouvert' ? 0 : 1) - (b.statut === 'ouvert' ? 0 : 1) || a.date_heure.localeCompare(b.date_heure));
}

/** Repère à côté de la date : « Aujourd’hui », « Date passée », ou rien. */
export function repereDate(iso: string, maintenant: Date = new Date()): 'Aujourd’hui' | 'Date passée' | null {
	const j = jourLocal(new Date(iso)), m = jourLocal(maintenant);
	return j === m ? 'Aujourd’hui' : j < m ? 'Date passée' : null;
}
