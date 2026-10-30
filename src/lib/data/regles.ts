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
