// Progression d'un thème en volets : les acquises puis les « à revoir », le reste vide.
export type CaseProgression = 'acquise' | 'a_revoir' | 'vide';

export function casesProgression(acquises: number, aRevoir: number, total: number, n = 10): CaseProgression[] {
	if (total <= 0) return Array(n).fill('vide');
	// Une seule réponse se voit toujours : au moins un volet dès qu'il y a quelque chose.
	const part = (x: number) => (x > 0 ? Math.max(1, Math.round((x / total) * n)) : 0);
	let a = part(acquises);
	let r = part(aRevoir);
	// Arrondis trop généreux : on rogne d'abord la plus grande des deux parts.
	while (a + r > n) {
		if (a >= r) a--;
		else r--;
	}
	return [...Array(a).fill('acquise'), ...Array(r).fill('a_revoir'), ...Array(n - a - r).fill('vide')];
}
