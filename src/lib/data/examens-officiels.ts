// Examens officiels côté stagiaire : convocations et passation (fonctions SQL « examens_passation »).
import type { SourcePassation } from '#lib/components/PassationExamen.svelte';
import { qualiteConnexion, type QualiteConnexion } from '#lib/examen-officiel/salle.ts';
import { supabase } from '#lib/supabase.ts';
import { ErreurServeur } from './seances.ts';

export type Convocation = {
	examen_id: string;
	titre: string;
	date_heure: string;
	lieu: string;
	duree_minutes: number;
	nb_questions: number;
	formateur: string | null;
	statut: 'brouillon' | 'ouvert' | 'clos';
	tentative_id: string | null;
	terminee: boolean;
};

/** `maintenant` : l'heure du serveur au moment de la lecture. */
export type InfoTentative = {
	id: string;
	examen_id: string;
	titre: string;
	debut: string;
	fin: string | null;
	duree_minutes: number;
	nb_questions: number;
	maintenant: string;
	date_heure: string;
	lieu: string;
};

export type BilanTentative = { score: number; total: number; seuil: number; reussi: boolean; par_theme: { theme: string; justes: number; total: number }[] };

/** Erreur lisible : refus du serveur (code PostgreSQL) ou coupure réseau. */
const erreur = (e: { message: string; code?: string }) => (e.code ? new ErreurServeur(e.message, e.code) : new Error(e.message));

export async function mesConvocations(): Promise<Convocation[]> {
	const { data, error } = await supabase.rpc('mes_convocations');
	if (error) throw erreur(error);
	return data ?? [];
}

/** Test de connexion avant l'examen : trois allers-retours vers le serveur, chacun limité à 4 secondes. */
export async function mesurerConnexion(): Promise<QualiteConnexion> {
	const mesures: (number | null)[] = [];
	for (let i = 0; i < 3; i++) {
		const t0 = performance.now();
		const delai = new Promise<null>((r) => setTimeout(() => r(null), 4000));
		const appel = supabase.rpc('mes_convocations').then((r) => (r.error ? null : performance.now() - t0), () => null);
		mesures.push(await Promise.race([appel, delai]));
	}
	return qualiteConnexion(mesures);
}

export async function commencerTentative(examenId: string, code: string): Promise<string> {
	const { data, error } = await supabase.rpc('commencer_tentative', { p_examen: examenId, p_code: code });
	if (error) throw erreur(error);
	return data as string;
}

export async function infoTentative(id: string): Promise<InfoTentative> {
	const { data, error } = await supabase.rpc('info_tentative', { p_tentative: id });
	if (error) throw erreur(error);
	return data[0] as InfoTentative;
}

/** À n'appeler que sur une tentative terminée : terminer_tentative achève une tentative en cours. */
export async function bilanTentative(id: string): Promise<BilanTentative> {
	const { data, error } = await supabase.rpc('terminer_tentative', { p_tentative: id });
	if (error) throw erreur(error);
	return data as BilanTentative;
}

type LigneQuestion = { ordre: number; question_id: string; enonce: string; theme: string; propositions: { lettre: string; texte: string }[]; lettre_choisie: string | null; signalee: boolean };

/** Branche l'écran commun d'examen sur une tentative officielle : la valeur choisie est la lettre. */
export function sourceTentative(id: string, titreExamen = ''): SourcePassation {
	return {
		cleFile: `tentative-${id}`,
		titre: 'Examen officiel',
		sousTitre: titreExamen || 'Sans correction',
		urlResultat: `/tentative/${id}/resultat`,
		async charger() {
			const info = await infoTentative(id);
			const base = { debut: info.debut, dureeMinutes: info.duree_minutes, maintenant: info.maintenant };
			if (info.fin) return { ...base, fin: info.fin, questions: [] };
			// Temps écoulé selon le serveur : il refuse les questions ; l'écran envoie les réponses en attente et termine.
			const finServeur = new Date(info.debut).getTime() + info.duree_minutes * 60_000 + 2 * 60_000;
			if (new Date(info.maintenant).getTime() > finServeur) return { ...base, fin: null, questions: [] };
			const { data, error } = await supabase.rpc('questions_de_tentative', { p_tentative: id });
			if (error) throw erreur(error);
			return {
				...base,
				fin: null,
				questions: ((data ?? []) as LigneQuestion[]).map((q) => ({
					questionId: q.question_id,
					theme: q.theme,
					enonce: q.enonce,
					propositions: q.propositions.map((p) => ({ valeur: p.lettre, lettre: p.lettre, texte: p.texte })),
					choisie: q.lettre_choisie,
					signalee: q.signalee
				}))
			};
		},
		async repondre(questionId, valeur, reponduLe) {
			const { error } = await supabase.rpc('repondre_tentative', { p_tentative: id, p_question: questionId, p_lettre: valeur, p_repondu_le: reponduLe });
			if (error) throw erreur(error);
		},
		async signaler(questionId, signalee) {
			const { error } = await supabase.rpc('signaler_tentative', { p_tentative: id, p_question: questionId, p_signalee: signalee });
			if (error) throw erreur(error);
		},
		async terminer() {
			const { error } = await supabase.rpc('terminer_tentative', { p_tentative: id });
			if (error) throw erreur(error);
		},
		async noterSortie() {
			await supabase.rpc('noter_sortie', { p_tentative: id });
		}
	};
}
