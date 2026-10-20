<script lang="ts">
	// Résultat d'un examen officiel. Le mot est toujours écrit : la couleur ne porte jamais seule l'information.
	// « grand » : dans le bandeau du résultat ; « petit » : dans un tableau.
	let { reussi, taille = 'grand' }: { reussi: boolean; taille?: 'grand' | 'petit' } = $props();
</script>

<span class="badge {taille}" class:reussi class:echoue={!reussi}>
	<svg width={taille === 'grand' ? 18 : 14} height={taille === 'grand' ? 18 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		{#if reussi}<path d="M4 12l5 5L20 6" />{:else}<path d="M6 6l12 12M18 6L6 18" />{/if}
	</svg>
	{reussi ? 'Réussi' : 'Non réussi'}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-weight: 700;
		border-radius: var(--r-petit);
		white-space: nowrap;
	}
	.grand {
		font-size: 18px;
		padding: 8px 14px;
		color: var(--papier);
	}
	.grand.reussi {
		background: var(--bleu);
	}
	.grand.echoue {
		background: var(--rouge);
	}
	.petit {
		font-size: 13px;
		padding: 4px 9px;
		gap: 5px;
	}
	.petit.reussi {
		background: var(--bleu-clair);
		color: var(--bleu-texte);
	}
	.petit.echoue {
		background: var(--rouge-clair);
		color: var(--rouge-texte);
	}
</style>
