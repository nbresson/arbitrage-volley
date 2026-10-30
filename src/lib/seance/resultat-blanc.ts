// Résultat d'un examen blanc : verdict, comparaison avec le précédent, temps utilisé (fonctions pures).
import { pluriel } from '#lib/domain/texte.ts';

/** Seuil de réussite des examens blancs : 70 % (21 / 30). Provisoire, en attendant la décision du comité. */
export const SEUIL_BLANC = 0.7;

export function verdictBlanc(score: number, total: number): { reussi: boolean; seuil: number; texte: string } {
	const seuil = Math.ceil(Math.round(total * SEUIL_BLANC * 1000) / 1000);
	// Le seuil officiel est fixé par chaque formateur : le verdict dit bien qu'il s'agit du seuil provisoire.
	const rappel = `seuil provisoire de 70 % (${seuil} / ${total})`;
	if (score >= seuil) return { reussi: true, seuil, texte: `Au ${rappel}, cet examen serait réussi.` };
	return { reussi: false, seuil, texte: `Il manque ${pluriel(seuil - score, 'point')} pour atteindre le ${rappel}.` };
}

type Score = { score: number; total: number };
const signe = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);
const SUITE = 'par rapport à votre dernier examen blanc.';

/** « +3 points par rapport à votre dernier examen blanc. » ; en pourcentage si le nombre de questions diffère. */
export function comparaison(actuel: Score, precedent: Score | null): string | null {
	if (!precedent || !precedent.total || !actuel.total) return null;
	if (actuel.total === precedent.total) {
		const e = actuel.score - precedent.score;
		return e ? `${signe(e)} ${Math.abs(e) > 1 ? 'points' : 'point'} ${SUITE}` : 'Même score que votre dernier examen blanc.';
	}
	const e = Math.round((actuel.score / actuel.total) * 100) - Math.round((precedent.score / precedent.total) * 100);
	return e ? `${signe(e)} % de bonnes réponses ${SUITE}` : 'Même taux de réussite que votre dernier examen blanc.';
}

/** « 31 min sur 45 » : le temps passé, borné à la durée prévue. */
export function tempsUtilise(debut: string, fin: string | null, dureeMinutes: number | null): string | null {
	if (!fin || !dureeMinutes) return null;
	const minutes = Math.min(dureeMinutes, Math.floor((new Date(fin).getTime() - new Date(debut).getTime()) / 60_000));
	return `${minutes < 1 ? 'moins d’une minute' : `${minutes} min`} sur ${dureeMinutes}`;
}

/** L'examen blanc commencé juste avant `id` dans la liste (dans n'importe quel ordre), ou null. */
export function examenPrecedent<T extends { id: string; debut: string }>(liste: T[], id: string): T | null {
	const tries = [...liste].sort((a, b) => a.debut.localeCompare(b.debut));
	const i = tries.findIndex((e) => e.id === id);
	return i > 0 ? tries[i - 1] : null;
}
