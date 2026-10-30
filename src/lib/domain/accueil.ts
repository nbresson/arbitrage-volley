// Accueil du stagiaire : fonctions pures (régularité, tri des thèmes, convocation).
import type { LigneTheme } from '#lib/data/avancement.ts';

const JOUR = 86_400_000;
const cle = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Jours consécutifs avec au moins une séance, en remontant depuis aujourd'hui (ou hier si rien aujourd'hui). */
export function serieDeJours(debuts: string[], aujourdhui = new Date()): number {
	const jours = new Set(debuts.map((d) => cle(new Date(d))));
	let j = cle(aujourdhui);
	if (!jours.has(j)) j -= JOUR;
	let serie = 0;
	while (jours.has(j)) {
		serie++;
		j -= JOUR;
	}
	return serie;
}

/** Séances depuis le lundi de la semaine en cours. */
export function seancesDeLaSemaine(debuts: string[], aujourdhui = new Date()): number {
	const lundi = cle(aujourdhui) - ((aujourdhui.getDay() + 6) % 7) * JOUR;
	return debuts.filter((d) => new Date(d).getTime() >= lundi).length;
}

export type TriThemes = 'reglement' | 'faibles' | 'alpha';

export function trierLignes<T extends LigneTheme & { ordre?: number }>(lignes: T[], tri: TriThemes): T[] {
	const copie = [...lignes];
	if (tri === 'alpha') return copie.sort((a, b) => a.theme.localeCompare(b.theme, 'fr'));
	if (tri === 'faibles') {
		// Les thèmes avec le plus d'« à revoir », puis ceux non commencés, puis les mieux acquis.
		const rang = (l: LigneTheme) => (l.aRevoir > 0 ? 0 : !l.commence ? 1 : 2);
		return copie.sort((a, b) => rang(a) - rang(b) || b.aRevoir - a.aRevoir || a.acquises / a.total - b.acquises / b.total);
	}
	return copie;
}

/** Nombre de jours entiers entre aujourd'hui et une date (négatif si passée). */
export function joursAvant(iso: string, aujourdhui = new Date()): number {
	return Math.round((cle(new Date(iso)) - cle(aujourdhui)) / JOUR);
}

/** Environ 45 secondes par question, arrondi à la minute. */
export const tempsRestantEstime = (questionsRestantes: number) => (questionsRestantes <= 0 ? 0 : Math.max(1, Math.round((questionsRestantes * 45) / 60)));

const horodatage = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Fichier agenda (.ics) d'une convocation, à télécharger. */
export function fichierIcs(c: { titre: string; lieu: string | null; date_heure: string; duree_minutes: number }): string {
	const debut = new Date(c.date_heure);
	const fin = new Date(debut.getTime() + c.duree_minutes * 60_000);
	const echapper = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`);
	return [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Arbitrage volley//FR',
		'BEGIN:VEVENT',
		`UID:${horodatage(debut)}-${echapper(c.titre).replace(/\s+/g, '-')}@arbitrage-volley`,
		`DTSTAMP:${horodatage(new Date())}`,
		`DTSTART:${horodatage(debut)}`,
		`DTEND:${horodatage(fin)}`,
		`SUMMARY:${echapper(c.titre)}`,
		...(c.lieu ? [`LOCATION:${echapper(c.lieu)}`] : []),
		'DESCRIPTION:Examen officiel d’arbitrage volley. Pensez à votre code d’accès donné par le formateur.',
		'END:VEVENT',
		'END:VCALENDAR'
	].join('\r\n');
}
