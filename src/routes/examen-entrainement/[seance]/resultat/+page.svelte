<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ResultatExamen from '#lib/components/ResultatExamen.svelte';
	import { infoSeance, terminerSeance, type BilanSeance } from '#lib/data/seances.ts';

	const seanceId = page.params.seance ?? '';
	let bilan = $state<BilanSeance | null>(null);
	let erreur = $state(false);

	$effect(() => {
		// Cette page n'achève jamais un examen : s'il est en cours, retour à l'examen (qui envoie ses réponses en attente).
		// Pour un examen terminé, terminer_seance est idempotente et renvoie le bilan enregistré.
		infoSeance(seanceId)
			.then(async (i) => {
				if (!i.fin) return goto(`/examen-entrainement/${seanceId}`, { replaceState: true });
				bilan = await terminerSeance(seanceId);
			})
			.catch(() => (erreur = true));
	});
</script>

{#if erreur}
	<p class="etat message-erreur" role="alert">Le résultat n’a pas pu être chargé. Vérifiez votre connexion puis rechargez la page.</p>
{:else if !bilan}
	<p class="etat" role="status">Calcul du résultat…</p>
{:else}
	<ResultatExamen {bilan} officiel={null} sousTitre="Résultat de l’examen d’entraînement" />
{/if}

<style>
	.etat {
		margin: 40px;
	}
</style>
