// Pictogramme d'un thème, choisi d'après son libellé (les thèmes sont gérés par les formateurs).
// L'ordre compte : la première règle qui correspond l'emporte. À défaut : le ballon.
import type { NomIcone } from '#lib/components/Icone.svelte';

const REGLES: [RegExp, NomIcone][] = [
	[/filet/i, 'filet'],
	[/service/i, 'service'],
	[/rotation|position/i, 'rotation'],
	[/remplacement/i, 'remplacement'],
	[/temps.?mort/i, 'temps-mort'],
	[/retard/i, 'chrono'],
	[/conduite|sanction|comportement/i, 'carton'],
	[/libéro|uniforme/i, 'maillot'],
	[/technologie|vidéo|challenge/i, 'ecran'],
	[/blessure/i, 'blessure'],
	[/arbitre/i, 'sifflet'],
	[/capitaine/i, 'capitaine'],
	[/entraîneur/i, 'entraineur'],
	[/contre/i, 'contre'],
	[/attaque/i, 'attaque'],
	[/interdit/i, 'interdit'],
	[/demande/i, 'questions']
];

export function iconeTheme(libelle: string | null | undefined): NomIcone {
	if (!libelle) return 'ballon';
	return REGLES.find(([motif]) => motif.test(libelle))?.[1] ?? 'ballon';
}
