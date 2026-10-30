<script lang="ts">
	// Boîte de confirmation modale (élément <dialog> natif : focus piégé, Échap pour annuler).
	let {
		ouvert,
		titre,
		texte,
		libelleAnnuler,
		libelleConfirmer,
		onannuler,
		onconfirmer,
		erreur = '',
		occupe = false
	}: {
		ouvert: boolean;
		titre: string;
		texte: string;
		libelleAnnuler: string;
		libelleConfirmer: string;
		onannuler: () => void;
		onconfirmer: () => void;
		erreur?: string;
		/** Action en cours : les deux boutons sont bloqués (pas de double appui), le bouton de confirmation dit « Envoi… ». */
		occupe?: boolean;
	} = $props();

	let dialogue = $state<HTMLDialogElement>();

	$effect(() => {
		if (!dialogue) return;
		if (ouvert && !dialogue.open) dialogue.showModal?.();
		if (!ouvert && dialogue.open) dialogue.close();
	});
</script>

<dialog bind:this={dialogue} aria-labelledby="dlg-titre" aria-describedby="dlg-texte" oncancel={(e) => (e.preventDefault(), !occupe && onannuler())}>
	<h2 id="dlg-titre">{titre}</h2>
	<p id="dlg-texte">{texte}</p>
	{#if erreur}<p class="message-erreur" role="alert">{erreur}</p>{/if}
	<div class="actions">
		<!-- svelte-ignore a11y_autofocus -->
		<button class="btn" autofocus onclick={onannuler} disabled={occupe}>{libelleAnnuler}</button>
		<button class="btn2" onclick={onconfirmer} disabled={occupe}>{occupe ? 'Envoi…' : libelleConfirmer}</button>
	</div>
</dialog>

<style>
	dialog {
		border: 0;
		border-radius: var(--r);
		max-width: 520px;
		width: calc(100% - 40px);
		padding: 28px 32px;
		color: var(--encre);
	}
	dialog::backdrop {
		background: rgb(28 36 48 / 0.6);
	}
	h2 {
		margin: 0 0 12px;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 28px;
	}
	p {
		margin: 0 0 14px;
		font-size: 16px;
		line-height: 1.6;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		padding-top: 6px;
	}
</style>
