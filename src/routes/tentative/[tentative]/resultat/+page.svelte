<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ResultatExamen from '#lib/components/ResultatExamen.svelte';
	import { bilanTentative, infoTentative, type BilanTentative } from '#lib/data/examens-officiels.ts';

	const tentativeId = page.params.tentative ?? '';
	let bilan = $state<BilanTentative | null>(null);
	let titre = $state('');
	let erreur = $state(false);

	$effect(() => {
		// Comme pour l'entraînement : cette page n'achève jamais un examen en cours.
		infoTentative(tentativeId)
			.then(async (i) => {
				if (!i.fin) return goto(`/tentative/${tentativeId}`, { replaceState: true });
				titre = i.titre;
				bilan = await bilanTentative(tentativeId);
			})
			.catch(() => (erreur = true));
	});
</script>

<svelte:head><title>{'Résultat de l’examen officiel'} · Arbitrage volley</title></svelte:head>

{#if erreur}
	<p class="etat message-erreur" role="alert">Le résultat n’a pas pu être chargé. Vérifiez votre connexion puis rechargez la page.</p>
{:else if !bilan}
	<p class="etat" role="status">Calcul du résultat…</p>
{:else}
	<ResultatExamen {bilan} officiel={{ seuil: bilan.seuil, reussi: bilan.reussi }} sousTitre="Résultat de l’examen officiel · {titre}" />
{/if}

<style>
	.etat {
		margin: 40px;
	}
</style>
