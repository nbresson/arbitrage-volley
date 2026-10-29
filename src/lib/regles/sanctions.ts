// Sanctions citées dans un texte de règle ou de correction, avec les cartons montrés par le 1er arbitre.
// Avertissement : jaune ; pénalité : rouge ; expulsion : jaune et rouge ensemble (une main) ;
// disqualification : jaune et rouge séparément (deux mains). L'avertissement verbal n'a pas de carton.

export type Carton = 'jaune' | 'rouge' | 'jaune-rouge';
export type Sanction = { id: string; libelle: string; cartons: Carton[] };

// Un mot entier, accents compris (\b ne reconnaît pas les lettres accentuées).
const mot = (racine: string, suite = '') => new RegExp(`(?<!\\p{L})${racine}s?(?!\\p{L})${suite}`, 'iu');

const SANCTIONS: (Sanction & { motif: RegExp })[] = [
	{ id: 'avertissement', libelle: 'Avertissement', cartons: ['jaune'], motif: mot('avertissement', '(?!\\s+(verbal|verbaux|oral|oraux))') },
	{ id: 'penalite', libelle: 'Pénalité', cartons: ['rouge'], motif: mot('(pénalité|pénalisation)') },
	{ id: 'expulsion', libelle: 'Expulsion', cartons: ['jaune-rouge'], motif: mot('expulsion') },
	{ id: 'disqualification', libelle: 'Disqualification', cartons: ['jaune', 'rouge'], motif: mot('disqualification') }
];

export function sanctionsCitees(texte: string): Sanction[] {
	return SANCTIONS.filter((s) => s.motif.test(texte)).map(({ id, libelle, cartons }) => ({ id, libelle, cartons }));
}
