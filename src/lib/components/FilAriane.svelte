<script lang="ts">
	// Fil d'Ariane de l'espace formateur : chaque étape est un lien, la dernière est la page courante.
	let { etapes }: { etapes: { libelle: string; href?: string }[] } = $props();
</script>

<nav class="fil" aria-label="Fil d’Ariane">
	<ol>
		{#each etapes as e, i (i)}
			<li>
				{#if e.href && i < etapes.length - 1}
					<a href={e.href}>{e.libelle}</a>
				{:else}
					<span aria-current="page">{e.libelle}</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--doux);
	}
	li + li::before {
		content: '›';
		margin: 0 10px;
		color: var(--filet);
		font-weight: 700;
	}
	a {
		color: var(--doux);
		text-decoration: none;
	}
	a:hover {
		color: var(--encre);
		text-decoration: underline;
	}
	span {
		color: var(--encre);
	}
</style>
