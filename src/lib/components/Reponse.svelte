<script lang="ts">
	// Une proposition de réponse : vrai bouton radio (navigation aux flèches), états de correction.
	export type EtatReponse = 'neutre' | 'ok' | 'ko' | 'ecartee';

	let {
		nom,
		valeur,
		lettre,
		texte,
		etat = 'neutre',
		choisie,
		desactivee,
		onchoisir
	}: {
		nom: string;
		valeur: string;
		lettre: string;
		texte: string;
		etat?: EtatReponse;
		choisie: boolean;
		desactivee: boolean;
		onchoisir: (valeur: string) => void;
	} = $props();

	const libelleEtat = $derived(
		etat === 'ok' ? (choisie ? 'Bonne réponse, la vôtre' : 'Bonne réponse') : etat === 'ko' ? 'Votre réponse' : ''
	);
</script>

<label class="r {etat}" class:sel={choisie && etat === 'neutre'}>
	<input type="radio" name={nom} value={valeur} checked={choisie} disabled={desactivee} onchange={() => onchoisir(valeur)} />
	<span class="l" aria-hidden="true">{lettre}</span>
	<span>{texte}</span>
	{#if libelleEtat}<em>{libelleEtat}</em>{/if}
</label>

<style>
	.r {
		position: relative;
		width: 100%;
		font-size: 17px;
		line-height: 1.4;
		display: grid;
		grid-template-columns: 36px 1fr auto;
		align-items: center;
		gap: 14px;
		background: var(--papier);
		border: 1.5px solid var(--filet);
		border-radius: var(--r);
		padding: 12px 16px;
		cursor: pointer;
		transition: border-color var(--duree-micro) ease-out;
	}
	/* Le survol ne remplace jamais la bordure d'un état corrigé. */
	.r.neutre:not(.sel):hover {
		border-color: var(--doux);
	}
	.r:has(input:focus-visible) {
		outline: 2px solid var(--bleu);
		outline-offset: 2px;
	}
	input {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
		margin: 0;
	}
	.l {
		width: 32px;
		height: 32px;
		border-radius: var(--r-petit);
		display: grid;
		place-items: center;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 20px;
		background: var(--sol);
		color: var(--doux);
	}
	em {
		font-style: normal;
		font-weight: 700;
		font-size: 13px;
	}
	.sel {
		border: 2px solid var(--encre);
	}
	.sel .l {
		background: var(--tableau);
		color: var(--sur-fonce);
	}
	.ok {
		border: 2px solid var(--bleu);
		background: var(--bleu-clair);
		cursor: default;
	}
	.ok .l {
		background: var(--bleu);
		color: var(--sur-fonce);
	}
	.ok em {
		color: var(--bleu-texte);
	}
	.ko {
		border: 2px solid var(--rouge);
		cursor: default;
	}
	.ko .l {
		background: var(--rouge);
		color: var(--sur-fonce);
	}
	.ko em {
		color: var(--rouge-texte);
	}
	.ecartee {
		color: var(--doux);
		cursor: default;
	}
</style>
