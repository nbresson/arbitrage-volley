// Consignes CFA : éditions et consignes saisies par les formateurs (tables editions et regles, source « cfa »).
import type { FormulaireConsigne } from '#lib/formateur/validation-consigne.ts';
import { supabase } from '#lib/supabase.ts';
import { viderCacheRegles } from './regles.ts';

export type EditionCfa = { id: string; libelle: string; active: boolean; consignes: number };
export type Consigne = { id: string; reference: string; titre: string | null; texte: string; citee: boolean };

const verifier = <T>(r: { data: T; error: { message: string } | null }): T => {
	if (r.error) throw new Error(r.error.message);
	return r.data;
};

export async function editionsCfa(): Promise<EditionCfa[]> {
	const lignes = verifier(await supabase.from('editions').select('id, libelle, active, regles(count)').eq('source', 'cfa').order('cree_le', { ascending: false })) as any[];
	return (lignes ?? []).map((e) => ({ id: e.id, libelle: e.libelle, active: e.active, consignes: e.regles?.[0]?.count ?? 0 }));
}

/** Une nouvelle édition est créée inactive : on y saisit les consignes, puis on l'active. */
export async function creerEditionCfa(libelle: string): Promise<string> {
	return (verifier(await supabase.from('editions').insert({ source: 'cfa', libelle: libelle.trim(), active: false }).select('id').single()) as { id: string }).id;
}

/** Renvoie le nombre de questions validées passées « à relire ». */
export async function activerEdition(id: string): Promise<number> {
	const n = verifier(await supabase.rpc('activer_edition', { p_edition: id })) as number;
	viderCacheRegles();
	return n;
}

/** Nombre de questions validées liées à une consigne d'une édition CFA active (elles passeront « à relire »). */
export async function questionsLieesAuCfaActif(): Promise<number> {
	const lignes = verifier(
		await supabase.from('question_regles').select('question_id, questions!inner(statut), regles!inner(editions!inner(source, active))').eq('questions.statut', 'validee').eq('regles.editions.source', 'cfa').eq('regles.editions.active', true)
	) as { question_id: string }[];
	return new Set((lignes ?? []).map((l) => l.question_id)).size;
}

export async function consignes(editionId: string): Promise<Consigne[]> {
	const lignes = verifier(await supabase.from('regles').select('id, reference, titre, texte, ordre, question_regles(question_id)').eq('edition_id', editionId).order('ordre').order('reference')) as any[];
	return (lignes ?? []).map((r) => ({ id: r.id, reference: r.reference, titre: r.titre, texte: r.texte, citee: (r.question_regles ?? []).length > 0 }));
}

export async function enregistrerConsigne(editionId: string, f: FormulaireConsigne, id: string | null, ordre: number) {
	const ligne = { edition_id: editionId, reference: f.reference.trim(), titre: f.titre.trim() || null, texte: f.texte.trim(), parent_reference: null };
	if (id) verifier(await supabase.from('regles').update(ligne).eq('id', id));
	else verifier(await supabase.from('regles').insert({ ...ligne, ordre }));
	viderCacheRegles();
}

export async function supprimerConsigne(id: string) {
	verifier(await supabase.from('regles').delete().eq('id', id));
	viderCacheRegles();
}
