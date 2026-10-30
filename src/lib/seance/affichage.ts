// Affichage d'une correction : passage surligné dans la règle, lecteur vidéo intégré.

/** Découpe un texte en segments, ceux qui correspondent au passage étant marqués (insensible à la casse et aux espaces). */
export function surlignerPassage(texte: string, passage: string | null | undefined): { texte: string; surligne: boolean }[] {
	const p = passage?.trim();
	if (!p) return [{ texte, surligne: false }];
	const motif = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'iu');
	const m = motif.exec(texte);
	if (!m) return [{ texte, surligne: false }];
	const avant = texte.slice(0, m.index);
	const apres = texte.slice(m.index + m[0].length);
	return [
		...(avant ? [{ texte: avant, surligne: false }] : []),
		{ texte: m[0], surligne: true },
		...(apres ? [{ texte: apres, surligne: false }] : [])
	];
}

/** Comment lire une vidéo : lecteur YouTube intégré, lecteur vidéo pour un fichier, lien sinon. */
export function lecteurVideo(url: string | null | undefined): { type: 'youtube' | 'fichier' | 'lien'; src: string } | null {
	if (!url) return null;
	if (/youtube(-nocookie)?\.com\/embed\//.test(url)) return { type: 'youtube', src: url };
	if (/\.(mp4|webm)(\?|$)/i.test(url)) return { type: 'fichier', src: url };
	return { type: 'lien', src: url };
}
