<script lang="ts">
	import MessageErreur from '#lib/components/MessageErreur.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ResultatExamen from '#lib/components/ResultatExamen.svelte';
	import { bilanTentative, infoTentative, type BilanTentative } from '#lib/data/examens-officiels.ts';
	import { texteFinAuto } from '#lib/examen-officiel/salle.ts';

	const tentativeId = page.params.tentative ?? '';
	let bilan = $state<BilanTentative | null>(null);
	let titre = $state('');
	let contexte = $state<{ date: string; lieu: string } | null>(null);
	// Arrivée après la fin automatique du temps : ?fin=auto&n=<réponses envoyées>.
	const annonce = page.url.searchParams.get('fin') === 'auto' ? texteFinAuto(Number(page.url.searchParams.get('n') ?? 0)) : '';
	let erreur = $state(false);

	$effect(() => {
		// Comme pour l'entraînement : cette page n'achève jamais un examen en cours.
		infoTentative(tentativeId)
			.then(async (i) => {
				if (!i.fin) return goto(`/tentative/${tentativeId}`, { replaceState: true });
				titre = i.titre;
				if (i.date_heure) contexte = { date: i.date_heure, lieu: i.lieu };
				bilan = await bilanTentative(tentativeId);
			})
			.catch(() => (erreur = true));
	});
</script>

<svelte:head><title>{'Résultat de l’examen officiel'} · Arbitrage volley</title></svelte:head>

{#if erreur}
	<MessageErreur texte="Le résultat n’a pas pu être chargé." classe="etat" />
{:else if !bilan}
	<p class="etat" role="status">Calcul du résultat…</p>
{:else}
	<ResultatExamen {bilan} officiel={{ seuil: bilan.seuil, reussi: bilan.reussi }} sousTitre="Résultat de l’examen officiel · {titre}" {contexte} {annonce} tentative={tentativeId} />
{/if}

<style>
	.etat {
		margin: 40px;
	}
</style>
