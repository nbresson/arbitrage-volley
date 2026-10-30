import type { Lettre, RoleCible } from '#lib/domain/types.ts';

export type FormulaireQuestion = {
	enonce: string;
	propositions: { lettre: Lettre; texte: string; explication?: string }[];
	bonne: Lettre | null;
	explication: string;
	themeId: string | null;
	niveauId: string | null;
	roleCible: RoleCible;
	usage: 'entrainement' | 'reserve_examen';
	videoUrl: string;
	regles: { id: string; principale: boolean; passage?: string }[];
};

/** URL d'intégration pour YouTube (youtube-nocookie), URL d'origine pour FIVB Academy, null sinon. */
export function normaliserVideo(url: string): string | null {
	const u = url.trim();
	if (!u) return null;
	let p: URL;
	try {
		p = new URL(u);
	} catch {
		return null;
	}
	const hote = p.hostname.replace(/^www\./, '');
	let id: string | null = null;
	if (hote === 'youtu.be') id = p.pathname.slice(1);
	else if (hote === 'youtube.com' || hote === 'm.youtube.com') id = p.searchParams.get('v');
	if (id && /^[\w-]{6,}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
	if (hote === 'fivbacademy.com' && /\.mp4$/i.test(p.pathname)) return u;
	return null;
}

const vide = (s: string | null | undefined) => !s || !s.trim();

/** Erreurs du formulaire d'édition, clé = champ. Objet vide si tout est correct. */
export function validerFormulaire(f: FormulaireQuestion): Record<string, string> {
	const e: Record<string, string> = {};
	if (vide(f.enonce)) e.enonce = 'Rédigez l’énoncé.';
	if (f.propositions.length !== 4 || f.propositions.some((p) => vide(p.texte))) e.propositions = 'Remplissez les 4 propositions.';
	if (!f.bonne) e.bonne = 'Choisissez la bonne réponse.';
	if (vide(f.explication)) e.explication = 'Rédigez l’explication.';
	if (!f.themeId) e.theme = 'Choisissez un thème.';
	if (!f.niveauId) e.niveau = 'Choisissez un niveau.';
	if (!f.regles.length) e.regles = 'Liez au moins une règle.';
	else if (f.regles.filter((r) => r.principale).length !== 1) e.regles = 'Une seule règle principale.';
	if (!vide(f.videoUrl) && !normaliserVideo(f.videoUrl)) e.video = 'Lien vidéo non reconnu (YouTube ou FIVB Academy).';
	return e;
}
