import { expect, test } from 'vitest';
import { sanctionsCitees } from '../../src/lib/regles/sanctions.ts';

test('repère chaque sanction citée, une seule fois, dans l’ordre de gravité', () => {
	expect(sanctionsCitees('Une pénalité, puis une expulsion. Nouvelle pénalité.').map((s) => s.id)).toEqual(['penalite', 'expulsion']);
	expect(sanctionsCitees('Disqualification du joueur ; avertissement au capitaine.').map((s) => s.id)).toEqual([
		'avertissement',
		'disqualification'
	]);
});

test('les cartons correspondent à chaque sanction', () => {
	const [p, e, d] = sanctionsCitees('pénalité expulsion disqualification');
	expect(p.cartons).toEqual(['rouge']);
	expect(e.cartons).toEqual(['jaune-rouge']);
	expect(d.cartons).toEqual(['jaune', 'rouge']);
});

test('l’avertissement verbal ou oral n’a pas de carton', () => {
	expect(sanctionsCitees('Un avertissement verbal est donné.')).toEqual([]);
	expect(sanctionsCitees('Avertissement oral au joueur.')).toEqual([]);
	expect(sanctionsCitees('Avertissement pour retard.').map((s) => s.id)).toEqual(['avertissement']);
});

test('pluriels et majuscules', () => {
	expect(sanctionsCitees('Les PÉNALITÉS et les expulsions').map((s) => s.id)).toEqual(['penalite', 'expulsion']);
	expect(sanctionsCitees('Aucune sanction ici.')).toEqual([]);
});
