<script lang="ts">
	// Message d'erreur avec une action : « Réessayer » (recharge la page par défaut) et un détail dépliable,
	// utile si l'on doit décrire le problème à son formateur.
	let { texte, detail = '', classe = '', onreessayer }: { texte: string; detail?: string; classe?: string; onreessayer?: () => void } = $props();

	const contexte = () =>
		`${navigator.onLine ? 'Appareil connecté : le serveur n’a pas répondu.' : 'Appareil hors ligne.'} ${new Date().toLocaleString('fr-FR')} · ${location.pathname}`;
	// svelte-ignore state_referenced_locally
	const detailAffiche = detail || contexte();
</script>

<div class="message-erreur erreur-action {classe}" role="alert">
	<p>{texte} Vérifiez votre connexion, puis réessayez.</p>
	<div class="actions">
		<button type="button" class="btn2" onclick={() => (onreessayer ? onreessayer() : location.reload())}>Réessayer</button>
		<details>
			<summary>Détail</summary>
			<p class="detail">{detailAffiche}</p>
		</details>
	</div>
</div>

<style>
	.erreur-action.etat {
		margin: 40px;
	}
	.erreur-action {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	p {
		margin: 0;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 18px;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
		min-height: 44px;
		display: flex;
		align-items: center;
	}
	.detail {
		font-size: 13px;
		font-weight: 400;
	}
</style>
