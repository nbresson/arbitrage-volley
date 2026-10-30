<script lang="ts">
	import type { ResultatValidation } from '#lib/seance/pedagogique.ts';
	import SourcesOnglets from './SourcesOnglets.svelte';

	let {
		resultat,
		decision,
		lettre = '',
		propositions = [],
		choix = null
	}: {
		resultat: ResultatValidation | null;
		decision: string;
		lettre?: string;
		propositions?: { id: string; lettre: string; texte: string }[];
		choix?: string | null;
	} = $props();

	// Pourquoi la proposition choisie est fausse, et pourquoi les autres le sont (si le formateur l'a rédigé).
	const explications = $derived(resultat?.explications_propositions ?? {});
	const pourquoiChoix = $derived(choix && !resultat?.correcte ? (explications[choix] ?? null) : null);
	const autres = $derived(
		propositions.filter((p) => p.id !== resultat?.bonne_proposition_id && p.id !== choix && explications[p.id]).map((p) => ({ ...p, pourquoi: explications[p.id] }))
	);
</script>

{#if resultat}
	<h2 class="titre"><span class="surtitre">Bonne réponse{lettre ? ` : ${lettre}` : ''}</span>{decision}</h2>
	<p class="verdict" class:juste={resultat.correcte}>
		{resultat.correcte ? 'Vous avez donné la bonne réponse.' : resultat.sans_reponse ? 'Vous n’avez pas répondu : voici la décision et la règle.' : 'Votre réponse n’était pas la bonne.'}
	</p>
	<p class="explication">{resultat.explication}</p>
	{#if pourquoiChoix}
		<p class="pourquoi"><strong>Pourquoi votre réponse était fausse :</strong> {pourquoiChoix}</p>
	{/if}
	{#if autres.length}
		<details class="autres">
			<summary>Pourquoi les autres réponses sont fausses</summary>
			<ul>
				{#each autres as a (a.id)}<li><strong>{a.lettre}</strong> · {a.texte} — {a.pourquoi}</li>{/each}
			</ul>
		</details>
	{/if}
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
	.pourquoi {
		margin: 0;
		padding: 10px 14px;
		background: var(--rouge-clair);
		border-radius: var(--r);
		font-size: 15px;
		line-height: 1.5;
	}
	.autres {
		font-size: 15px;
	}
	.autres summary {
		cursor: pointer;
		font-weight: 600;
		color: var(--doux);
	}
	.autres ul {
		margin: 8px 0 0;
		padding-left: 18px;
		line-height: 1.5;
	}
</style>
