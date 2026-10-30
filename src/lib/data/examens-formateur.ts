// Examens officiels côté formateur (tables « examens_officiels » et fonctions SQL « examens_formateur »).
// Les messages d'erreur du serveur sont déjà rédigés pour l'utilisateur : ils sont relayés tels quels.
import type { FormulaireExamen } from '#lib/formateur/validation-examen.ts';
import { supabase } from '#lib/supabase.ts';

export type StatutExamen = 'brouillon' | 'ouvert' | 'clos';

export type LigneExamen = { id: string; titre: string; date_heure: string; lieu: string; statut: StatutExamen; inscrits: number };

export type Examen = {
	id: string;
	titre: string;
	date_heure: string;
	lieu: string;
	duree_minutes: number;
	seuil_reussite: number;
	statut: StatutExamen;
	questions: { question_id: string; ordre: number; enonce: string; theme: string | null }[];
	inscrits: string[];
};

export type ResultatStagiaire = {
	stagiaire_id: string;
	prenom: string;
	nom: string;
	etat: 'absent' | 'en_cours' | 'termine';
	tentative_id: string | null;
	score: number | null;
	total: number | null;
	reussi: boolean | null;
	/** Suivi en direct : heures de début et de fin, réponses données sur nb_questions, sorties de l'écran. */
	debut: string | null;
	fin: string | null;
	repondues: number;
	sorties: number;
	nb_questions: number;
};

const verifier = <T>(r: { data: T; error: { message: string; code?: string } | null }): T => {
	if (r.error) {
		// Désinscription d'un stagiaire qui a déjà commencé (clé étrangère des tentatives).
		if (r.error.code === '23503') throw new Error('Ce stagiaire a déjà commencé l’examen : il ne peut plus être désinscrit.');
		throw new Error(r.error.message);
	}
	return r.data;
};

export async function listerExamens(): Promise<LigneExamen[]> {
	const lignes = verifier(
		await supabase.from('examens_officiels').select('id, titre, date_heure, lieu, statut, inscriptions(count)').order('date_heure', { ascending: false })
	) as any[];
	return (lignes ?? []).map((e) => ({ id: e.id, titre: e.titre, date_heure: e.date_heure, lieu: e.lieu, statut: e.statut, inscrits: e.inscriptions?.[0]?.count ?? 0 }));
}

export async function lireExamen(id: string): Promise<Examen> {
	const e = verifier(
		await supabase
			.from('examens_officiels')
			.select('id, titre, date_heure, lieu, duree_minutes, seuil_reussite, statut, examen_questions(question_id, ordre, enonce, questions(enonce, themes(libelle))), inscriptions(stagiaire_id)')
			.eq('id', id)
			.single()
	) as any;
	return {
		...e,
		questions: [...(e.examen_questions ?? [])]
			.sort((a: any, b: any) => a.ordre - b.ordre)
			// Énoncé figé s'il existe (examen ouvert), sinon l'énoncé actuel de la question.
			.map((q: any) => ({ question_id: q.question_id, ordre: q.ordre, enonce: q.enonce ?? q.questions?.enonce ?? '', theme: q.questions?.themes?.libelle ?? null })),
		inscrits: (e.inscriptions ?? []).map((i: any) => i.stagiaire_id)
	};
}

export async function enregistrerExamen(f: FormulaireExamen, id: string | null): Promise<string> {
	const ligne = {
		titre: f.titre.trim(),
		date_heure: new Date(f.dateHeure).toISOString(),
		lieu: f.lieu.trim(),
		duree_minutes: f.dureeMinutes,
		seuil_reussite: f.seuil
	};
	if (id) {
		verifier(await supabase.from('examens_officiels').update(ligne).eq('id', id));
		return id;
	}
	return (verifier(await supabase.from('examens_officiels').insert(ligne).select('id').single()) as { id: string }).id;
}

export async function composerExamen(id: string, questionIds: string[]): Promise<number> {
	return verifier(await supabase.rpc('composer_examen', { p_examen: id, p_question_ids: questionIds })) as number;
}

export async function inscrire(id: string, stagiaireIds: string[]) {
	verifier(
		await supabase
			.from('inscriptions')
			.upsert(stagiaireIds.map((s) => ({ examen_id: id, stagiaire_id: s })), { onConflict: 'examen_id,stagiaire_id', ignoreDuplicates: true })
	);
}

export async function desinscrire(id: string, stagiaireId: string) {
	verifier(await supabase.from('inscriptions').delete().eq('examen_id', id).eq('stagiaire_id', stagiaireId));
}

export async function ouvrirExamen(id: string): Promise<string> {
	return verifier(await supabase.rpc('ouvrir_examen', { p_examen: id })) as string;
}

export async function codeExamen(id: string): Promise<string | null> {
	const lignes = verifier(await supabase.from('examen_codes').select('code').eq('examen_id', id)) as { code: string }[];
	return lignes?.[0]?.code ?? null;
}

export async function cloreExamen(id: string) {
	verifier(await supabase.rpc('clore_examen', { p_examen: id }));
}

export async function resultatsExamen(id: string): Promise<ResultatStagiaire[]> {
	return (verifier(await supabase.rpc('resultats_examen', { p_examen: id })) as ResultatStagiaire[]) ?? [];
}

// Fiche stagiaire ---------------------------------------------------------------------

export type DetailTentative = {
	examen_id: string;
	titre: string;
	date_heure: string;
	score: number;
	total: number;
	seuil: number;
	reussi: boolean;
	questions: { ordre: number; enonce: string; lettre: string | null; bonne_lettre: string; juste: boolean }[];
	regles: { reference: string; edition: string; titre: string | null; erreurs: number }[];
};

export type ExamenPasse = { tentative_id: string; titre: string; date_heure: string; score: number; total: number; reussi: boolean };

/** Examens officiels terminés d'un stagiaire, les plus récents en premier. Jamais ses examens d'entraînement. */
export async function examensDuStagiaire(stagiaireId: string): Promise<ExamenPasse[]> {
	const lignes = verifier(
		await supabase
			.from('tentatives')
			.select('id, score, total, reussi, fin, examens_officiels!inner(titre, date_heure)')
			.eq('stagiaire_id', stagiaireId)
			.not('fin', 'is', null)
	) as any[];
	return (lignes ?? [])
		.map((t) => ({ tentative_id: t.id, titre: t.examens_officiels.titre, date_heure: t.examens_officiels.date_heure, score: t.score, total: t.total, reussi: t.reussi }))
		.sort((a, b) => b.date_heure.localeCompare(a.date_heure));
}

export async function detailTentative(tentativeId: string): Promise<DetailTentative> {
	return verifier(await supabase.rpc('detail_tentative', { p_tentative: tentativeId })) as DetailTentative;
}
