<script lang="ts">
	// Pied de page discret : version et date de mise à jour, liens d'aide.
	const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(__DATE_MAJ__));
</script>

<footer class="pied-de-page">
	<span>Arbitrage volley · version {__VERSION__} · mise à jour le {date}</span>
	<span><a href="/aide">Aide et contact</a></span>
</footer>

<style>
	.pied-de-page {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px 20px;
		padding: 16px 40px 20px;
		border-top: 1px solid var(--filet);
		font-size: 13px;
		color: var(--doux);
	}
	.pied-de-page a {
		color: var(--doux);
	}
	@media (max-width: 700px) {
		.pied-de-page {
			padding: 16px 20px;
		}
	}
	@media print {
		.pied-de-page {
			display: none;
		}
	}
</style>
