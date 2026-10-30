import { titreLisible } from '#lib/domain/texte.ts';
import type { Regle } from '#lib/regles/arbre.ts';
import { supabase } from '#lib/supabase.ts';

export const slug = (libelle: string) =>
	libelle
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

export const urlRegle = (r: Pick<Regle, 'edition' | 'reference'>) =>
	`/regles/${slug(r.edition)}/${encodeURIComponent(r.reference)}`;

let cache: Promise<Regle[]> | null = null;

/** À appeler après une modification des règles (consignes CFA) pour relire la base au prochain accès. */
export function viderCacheRegles() {
	cache = null;
}

const PAGE = 1000; // plafond de lignes renvoyées par l'API Supabase en une requête

/** Toutes les règles des éditions actives (environ 750 aujourd'hui), chargées une fois, par pages de 1000. */
export function toutesLesRegles(): Promise<Regle[]> {
	cache ??= (async () => {
		const data: any[] = [];
		for (let debut = 0; ; debut += PAGE) {
			const { data: page, error } = await supabase
				.from('regles')
				.select('id, reference, parent_reference, titre, texte, texte_original, renvois, video_url, editions!inner(libelle, source, active)')
				.eq('editions.active', true)
				.order('id')
				.range(debut, debut + PAGE - 1);
			if (error) {
				cache = null;
				throw error;
			}
			data.push(...(page ?? []));
			if ((page ?? []).length < PAGE) break;
		}
		return data.map((l: any) => ({
			id: l.id,
			reference: l.reference,
			parent_reference: l.parent_reference,
			titre: l.titre,
			texte: l.texte,
			texte_original: l.texte_original,
			renvois: l.renvois ?? [],
			video_url: l.video_url,
			edition: l.editions.libelle,
			source: l.editions.source
		}));
	})();
	return cache;
}

const CLE_VUES = 'regles-consultees';

/** Mémorise les 30 dernières fiches consultées (confort local, sans garantie) ; l'accueil en montre 5. */
export function memoriserConsultation(r: Pick<Regle, 'edition' | 'reference' | 'titre' | 'texte'>) {
	try {
		const vues = lireConsultations().filter((v) => v.reference !== r.reference);
		const resume = titreLisible(r.titre) || r.texte.slice(0, 60);
		vues.unshift({ edition: r.edition, reference: r.reference, resume });
		localStorage.setItem(CLE_VUES, JSON.stringify(vues.slice(0, 30)));
	} catch {
		/* stockage indisponible : on ignore */
	}
}

export function lireConsultations(): { edition: string; reference: string; resume: string }[] {
	try {
		return JSON.parse(localStorage.getItem(CLE_VUES) ?? '[]');
	} catch {
		return [];
	}
}

// Lot E : questions liées, marque-pages, glossaire, figures --------------------------------------

/** Nombre de questions d'entraînement validées qui citent la règle. */
export async function nbQuestionsRegle(regleId: string): Promise<number> {
	const { data, error } = await supabase.rpc('nb_questions_regle', { p_regle: regleId });
	if (error) throw new Error(error.message);
	return (data as number) ?? 0;
}

/** Identifiants des règles épinglées par le compte connecté (« Mes règles »). */
export async function mesEpingles(): Promise<string[]> {
	const { data, error } = await supabase.from('regles_epinglees').select('regle_id').order('cree_le', { ascending: false });
	if (error) throw new Error(error.message);
	return (data ?? []).map((l) => l.regle_id as string);
}

export async function epingler(regleId: string, epinglee: boolean) {
	const { error } = epinglee
		? await supabase.from('regles_epinglees').upsert({ regle_id: regleId }, { onConflict: 'stagiaire_id,regle_id', ignoreDuplicates: true })
		: await supabase.from('regles_epinglees').delete().eq('regle_id', regleId);
	if (error) throw new Error(error.message);
}

export type Terme = { id: string; terme: string; definition: string };

let cacheGlossaire: Promise<Terme[]> | null = null;

/** Glossaire, chargé une fois par visite ; une liste vide si la lecture échoue (l'explication est un confort). */
export function glossaire(recharger = false): Promise<Terme[]> {
	if (recharger) cacheGlossaire = null;
	cacheGlossaire ??= (async () => {
		const { data, error } = await supabase.from('glossaire').select('id, terme, definition').order('terme');
		if (error) {
			cacheGlossaire = null;
			return [];
		}
		return (data ?? []) as Terme[];
	})();
	return cacheGlossaire;
}

export async function enregistrerTerme(t: { id?: string; terme: string; definition: string }) {
	const ligne = { terme: t.terme.trim(), definition: t.definition.trim(), modifie_le: new Date().toISOString() };
	const { error } = t.id ? await supabase.from('glossaire').update(ligne).eq('id', t.id) : await supabase.from('glossaire').insert(ligne);
	if (error) throw new Error(/duplicate|unique/i.test(error.message) ? 'Ce terme existe déjà dans le glossaire.' : error.message);
	cacheGlossaire = null;
}

export async function supprimerTerme(id: string) {
	const { error } = await supabase.from('glossaire').delete().eq('id', id);
	if (error) throw new Error(error.message);
	cacheGlossaire = null;
}

export type Figure = { reference: string; legende: string; image_url: string | null };

export async function figures(): Promise<Figure[]> {
	const { data, error } = await supabase.from('figures').select('reference, legende, image_url');
	if (error) return [];
	return (data ?? []) as Figure[];
}

export async function enregistrerFigure(f: Figure) {
	const { error } = await supabase
		.from('figures')
		.upsert({ reference: f.reference.trim(), legende: f.legende.trim(), image_url: f.image_url?.trim() || null, modifie_le: new Date().toISOString() });
	if (error) throw new Error(/check/i.test(error.message) ? 'Vérifiez la référence (Fig.9, Fig.1a…) et l’adresse de l’image (https://…).' : error.message);
}

export async function supprimerFigure(reference: string) {
	const { error } = await supabase.from('figures').delete().eq('reference', reference);
	if (error) throw new Error(error.message);
}
