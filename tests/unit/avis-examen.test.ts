// Avis après l'examen officiel : note de 1 à 5, commentaire facultatif, anonyme.
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';

const h = vi.hoisted(() => ({ donner: vi.fn(async () => {}), mon: vi.fn(async () => null) }));
vi.mock('#lib/supabase.ts', () => ({ supabase: {} }));
vi.mock('#lib/data/mesures.ts', () => ({ donnerAvis: h.donner, monAvis: h.mon }));

import AvisExamen from '../../src/lib/components/AvisExamen.svelte';

test('choisir une note puis envoyer : l’avis est enregistré et confirmé', async () => {
	const e = render(AvisExamen, { tentative: 't1' });
	const bouton = e.getByRole('button', { name: 'Envoyer mon avis' });
	expect(bouton).toBeDisabled();
	await fireEvent.click(e.getByLabelText(/Plutôt bien/));
	await fireEvent.input(e.getByLabelText(/Un commentaire/), { target: { value: 'Salle bruyante' } });
	await fireEvent.click(bouton);
	await waitFor(() => expect(h.donner).toHaveBeenCalledWith('t1', 4, 'Salle bruyante'));
	expect(await e.findByText('Merci, votre avis est enregistré.')).toBeInTheDocument();
	expect(e.getByText('Votre avis est transmis sans votre nom.')).toBeInTheDocument();
});
