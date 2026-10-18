<script lang="ts">
	import type { ResultatValidation } from '#lib/seance/pedagogique.ts';
	import SourcesOnglets from './SourcesOnglets.svelte';

	let { resultat, decision }: { resultat: ResultatValidation | null; decision: string } = $props();
</script>

{#if resultat}
	<h2 class="titre">{decision}</h2>
	<p class="verdict" class:juste={resultat.correcte}>
		{resultat.correcte ? 'Vous avez donné la bonne réponse.' : 'Votre réponse n’était pas la bonne.'}
	</p>
	<p class="explication">{resultat.explication}</p>
	<SourcesOnglets sources={resultat.sources} />
{:else}
	<h2 class="titre attente">Décision</h2>
	<p class="explication attente">
		La décision juste, son explication et la règle qui la fonde s’afficheront ici dès que vous aurez validé votre réponse.
	</p>
{/if}

<style>
	.titre {
		margin: 0;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 30px;
		line-height: 1.1;
		color: var(--bleu);
	}
	.verdict {
		margin: 0;
		font-weight: 700;
		color: var(--rouge-texte);
	}
	.verdict.juste {
		color: var(--bleu-texte);
	}
	.explication {
		margin: 0;
		font-size: 16px;
		line-height: 1.6;
		white-space: pre-line;
	}
	.attente {
		color: var(--doux);
	}
</style>
