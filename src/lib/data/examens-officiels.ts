// Examens officiels côté stagiaire : convocations et passation (fonctions SQL « examens_passation »).
import type { SourcePassation } from '#lib/components/PassationExamen.svelte';
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

export type InfoTentative = { id: string; examen_id: string; titre: string; debut: string; fin: string | null; duree_minutes: number; nb_questions: number };

export type BilanTentative = { score: number; total: number; seuil: number; reussi: boolean; par_theme: { theme: string; justes: number; total: number }[] };

/** Erreur lisible : refus du serveur (code PostgreSQL) ou coupure réseau. */
const erreur = (e: { message: string; code?: string }) => (e.code ? new ErreurServeur(e.message, e.code) : new Error(e.message));

export async function mesConvocations(): Promise<Convocation[]> {
	const { data, error } = await supabase.rpc('mes_convocations');
	if (error) throw erreur(error);
	return data ?? [];
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
			if (info.fin) return { debut: info.debut, dureeMinutes: info.duree_minutes, fin: info.fin, questions: [] };
			const { data, error } = await supabase.rpc('questions_de_tentative', { p_tentative: id });
			if (error) throw erreur(error);
			return {
				debut: info.debut,
				dureeMinutes: info.duree_minutes,
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
		}
	};
}
