<script lang="ts">
	// Les sanctions citées dans un texte, chacune avec ses cartons dessinés et son nom écrit.
	import { sanctionsCitees } from '#lib/regles/sanctions.ts';

	let { texte }: { texte: string } = $props();
	const sanctions = $derived(sanctionsCitees(texte));
</script>

{#if sanctions.length}
	<ul class="cartons" aria-label="Sanctions citées">
		{#each sanctions as s (s.id)}
			<li>
				<span class="dessins" aria-hidden="true">
					{#each s.cartons as c, i (i)}
						{#if c === 'jaune-rouge'}
							<span class="carton jaune superpose"></span><span class="carton rouge superpose deuxieme"></span>
						{:else}
							<span class="carton {c}"></span>
						{/if}
					{/each}
				</span>
				{s.libelle}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.cartons {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	li {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 4px 10px 4px 8px;
		border: 1px solid var(--filet);
		border-radius: var(--r-petit);
		background: var(--papier);
		font-size: 13px;
		font-weight: 600;
	}
	.dessins {
		display: inline-flex;
		align-items: center;
		gap: 3px;
	}
	/* Les cartons sont des objets réels : leurs couleurs les représentent, elles ne signalent pas un état. */
	.carton {
		width: 11px;
		height: 15px;
		border-radius: 2px;
		transform: rotate(-8deg);
	}
	.jaune {
		background: var(--ambre-vif);
	}
	.rouge {
		background: var(--rouge);
	}
	.superpose {
		transform: rotate(-14deg);
	}
	.deuxieme {
		margin-left: -7px;
		transform: rotate(6deg);
	}
</style>
