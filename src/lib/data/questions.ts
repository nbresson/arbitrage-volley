import type { Lettre, RoleCible } from '#lib/domain/types.ts';
import type { FormulaireQuestion } from '#lib/formateur/validation-question.ts';
import { normaliserVideo } from '#lib/formateur/validation-question.ts';
import { supabase } from '#lib/supabase.ts';

export type StatutQuestion = 'brouillon' | 'validee' | 'archivee';

export type LigneQuestion = {
	id: string;
	enonce: string;
	statut: StatutQuestion;
	a_relire: boolean;
	origine: 'casebook' | 'manuelle';
	role_cible: RoleCible;
	usage: 'entrainement' | 'reserve_examen';
	theme: string | null;
	niveau: string | null;
	theme_id: string | null;
	niveau_id: string | null;
	reference_origine: string | null;
};

export async function listerQuestions(): Promise<LigneQuestion[]> {
	const { data, error } = await supabase
		.from('questions')
		.select('id, enonce, statut, a_relire, origine, role_cible, usage, theme_id, niveau_id, themes(libelle), niveaux(libelle), cas_origine:regles!questions_origine_regle_id_fkey(reference)')
		.order('modifie_le', { ascending: false });
	if (error) throw new Error(error.message);
	return (data ?? []).map((q: any) => ({
		id: q.id,
		enonce: q.enonce,
		statut: q.statut,
		a_relire: q.a_relire,
		origine: q.origine,
		role_cible: q.role_cible,
		usage: q.usage,
		theme: q.themes?.libelle ?? null,
		niveau: q.niveaux?.libelle ?? null,
		theme_id: q.theme_id,
		niveau_id: q.niveau_id,
		reference_origine: q.cas_origine?.reference ?? null
	}));
}

export type RegleLiee = { id: string; reference: string; edition: string; principale: boolean };

export type QuestionComplete = {
	id: string;
	statut: StatutQuestion;
	a_relire: boolean;
	formulaire: FormulaireQuestion;
	reglesLiees: RegleLiee[];
	origine: { reference: string; texte: string; texte_original: string | null; video_url: string | null } | null;
};

export async function chargerQuestion(id: string): Promise<QuestionComplete> {
	const { data: q, error } = await supabase
		.from('questions')
		.select(
			'id, enonce, explication, theme_id, niveau_id, role_cible, usage, video_url, statut, a_relire, propositions(id, lettre, texte), bonnes_reponses(proposition_id), question_regles(principale, regles(id, reference, editions(libelle))), cas_origine:regles!questions_origine_regle_id_fkey(reference, texte, texte_original, video_url)'
		)
		.eq('id', id)
		.single();
	if (error) throw new Error(error.message);
	const props = [...(q.propositions as any[])].sort((a, b) => a.lettre.localeCompare(b.lettre));
	const bonneId = (q.bonnes_reponses as any)?.proposition_id ?? (q.bonnes_reponses as any[])?.[0]?.proposition_id;
	const reglesLiees: RegleLiee[] = (q.question_regles as any[]).map((l) => ({
		id: l.regles.id,
		reference: l.regles.reference,
		edition: l.regles.editions.libelle,
		principale: l.principale
	}));
	return {
		id: q.id,
		statut: q.statut,
		a_relire: q.a_relire,
		reglesLiees,
		origine: (q as any).cas_origine ?? null,
		formulaire: {
			enonce: q.enonce,
			propositions: props.map((p) => ({ lettre: p.lettre as Lettre, texte: p.texte })),
			bonne: (props.find((p) => p.id === bonneId)?.lettre as Lettre) ?? null,
			explication: q.explication,
			themeId: q.theme_id,
			niveauId: q.niveau_id,
			roleCible: q.role_cible,
			usage: q.usage,
			videoUrl: q.video_url ?? '',
			regles: reglesLiees.map((r) => ({ id: r.id, principale: r.principale }))
		}
	};
}

export const formulaireVide = (): FormulaireQuestion => ({
	enonce: '',
	propositions: (['A', 'B', 'C', 'D'] as const).map((lettre) => ({ lettre, texte: '' })),
	bonne: null,
	explication: '',
	themeId: null,
	niveauId: null,
	roleCible: 'arbitre',
	usage: 'entrainement',
	videoUrl: '',
	regles: []
});

/** Enregistre la question en une seule transaction côté base ; `valider` la publie. Renvoie son id. */
export async function enregistrerQuestion(id: string | null, f: FormulaireQuestion, valider: boolean): Promise<string> {
	const { data, error } = await supabase.rpc('enregistrer_question', {
		p_id: id,
		p_donnees: { ...f, videoUrl: normaliserVideo(f.videoUrl) },
		p_valider: valider
	});
	if (error) throw new Error(error.message);
	return data as string;
}

export async function archiverQuestion(id: string) {
	const { error } = await supabase.from('questions').update({ statut: 'archivee' }).eq('id', id);
	if (error) throw new Error(error.message);
}
