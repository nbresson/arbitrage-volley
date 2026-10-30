<script lang="ts">
	// Avis après l'examen officiel : une note de 1 à 5 et un commentaire facultatif.
	// La question posée est provisoire, en attendant la décision du comité.
	import '#lib/components/formulaire.css';
	import { donnerAvis, monAvis } from '#lib/data/mesures.ts';

	let { tentative }: { tentative: string } = $props();

	const NOTES = ['Très mal', 'Plutôt mal', 'Moyennement', 'Plutôt bien', 'Très bien'];
	let note = $state<number | null>(null);
	let commentaire = $state('');
	let etat = $state<'' | 'envoi' | 'envoye' | 'erreur'>('');

	$effect(() => {
		monAvis(tentative)
			.then((a) => {
				if (a) (note = a.note), (commentaire = a.commentaire ?? ''), (etat = 'envoye');
			})
			.catch(() => {});
	});

	async function envoyer(e: SubmitEvent) {
		e.preventDefault();
		if (!note) return;
		etat = 'envoi';
		try {
			await donnerAvis(tentative, note, commentaire);
			etat = 'envoye';
		} catch {
			etat = 'erreur';
		}
	}
</script>

<form class="avis" onsubmit={envoyer}>
	<fieldset>
		<legend>Comment s’est passé l’examen ?</legend>
		<div class="notes">
			{#each NOTES as libelle, i (i)}
				<label class:choisie={note === i + 1}>
					<input type="radio" name="note-avis" value={i + 1} checked={note === i + 1} onchange={() => ((note = i + 1), etat === 'envoye' && (etat = ''))} />
					<span class="chiffre" aria-hidden="true">{i + 1}</span><span class="libelle">{libelle}</span>
				</label>
			{/each}
		</div>
	</fieldset>
	<label class="champ">Un commentaire pour vos formateurs (facultatif)<textarea rows="3" maxlength="1000" bind:value={commentaire}></textarea></label>
	<p class="aide">Votre avis est transmis sans votre nom.</p>
	<div class="actions">
		<button class="btn2" type="submit" disabled={!note || etat === 'envoi'}>{etat === 'envoye' ? 'Modifier mon avis' : 'Envoyer mon avis'}</button>
		<span role="status">{etat === 'envoye' ? 'Merci, votre avis est enregistré.' : etat === 'erreur' ? 'L’avis n’a pas pu être envoyé. Réessayez.' : ''}</span>
	</div>
</form>

<style>
	.avis {
		display: flex;
		flex-direction: column;
		gap: 12px;
		border-top: 1px solid var(--filet);
		padding-top: 16px;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
	}
	legend {
		font-weight: 700;
		margin-bottom: 10px;
	}
	.notes {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 6px;
	}
	.notes label {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 8px 4px;
		min-height: 56px;
		border: 1.5px solid var(--filet);
		border-radius: var(--r);
		cursor: pointer;
		text-align: center;
	}
	.notes input {
		position: absolute;
		inset: 0;
		opacity: 0;
		margin: 0;
		cursor: pointer;
	}
	.notes label.choisie {
		border: 2px solid var(--trait);
		background: var(--ligne-survol);
	}
	.notes label:has(input:focus-visible) {
		outline: 2px solid var(--bleu);
		outline-offset: 2px;
	}
	.chiffre {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 20px;
	}
	.libelle {
		font-size: 12px;
		line-height: 1.2;
		color: var(--doux);
	}
	.aide {
		margin: 0;
		font-size: 13px;
		color: var(--doux);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
	}
</style>
