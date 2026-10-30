import { render } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import DialogueConfirmation from '../../src/lib/components/DialogueConfirmation.svelte';

test('dialogue occupé : boutons désactivés, « Envoi… »', () => {
	const e = render(DialogueConfirmation, { ouvert: true, titre: 'T', texte: 'x', libelleAnnuler: 'Non', libelleConfirmer: 'Terminer', occupe: true, onannuler: () => {}, onconfirmer: () => {} });
	expect(e.getByRole('button', { name: 'Envoi…', hidden: true })).toBeDisabled();
	expect(e.getByRole('button', { name: 'Non', hidden: true })).toBeDisabled();
});
