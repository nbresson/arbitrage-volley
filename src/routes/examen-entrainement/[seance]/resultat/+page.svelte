<script lang="ts">
	import MessageErreur from '#lib/components/MessageErreur.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ResultatExamen from '#lib/components/ResultatExamen.svelte';
	import { infoSeance, mesExamensBlancs, terminerSeance, type BilanSeance } from '#lib/data/seances.ts';
	import { texteFinAuto } from '#lib/examen-officiel/salle.ts';
	import { comparaison, examenPrecedent, tempsUtilise } from '#lib/seance/resultat-blanc.ts';

	const seanceId = page.params.seance ?? '';
	let bilan = $state<BilanSeance | null>(null);
	let blanc = $state<{ seanceId: string; temps: string | null; comparaison: string | null; date: string | null } | null>(null);
	let erreur = $state(false);
	const annonce = page.url.searchParams.get('fin') === 'auto' ? texteFinAuto(Number(page.url.searchParams.get('n') ?? 0)) : '';

	$effect(() => {
		// Cette page n'achève jamais un examen : s'il est en cours, retour à l'examen (qui envoie ses réponses en attente).
		// Pour un examen terminé, terminer_seance est idempotente et renvoie le bilan enregistré.
		infoSeance(seanceId)
			.then(async (i) => {
				if (!i.fin) return goto(`/examen-entrainement/${seanceId}`, { replaceState: true });
				// L'historique ne sert qu'à la comparaison : s'il ne se charge pas, le résultat s'affiche sans elle.
				const [b, liste] = await Promise.all([terminerSeance(seanceId), mesExamensBlancs().catch(() => [])]);
				blanc = {
					seanceId,
					temps: tempsUtilise(i.debut, i.fin, i.duree_minutes),
					comparaison: comparaison(b, examenPrecedent(liste, seanceId)),
					date: i.fin
				};
				bilan = b;
			})
			.catch(() => (erreur = true));
	});
</script>

<svelte:head><title>{'Résultat de l’examen blanc'} · Arbitrage volley</title></svelte:head>

{#if erreur}
	<MessageErreur texte="Le résultat n’a pas pu être chargé." classe="etat" />
{:else if !bilan}
	<p class="etat" role="status">Calcul du résultat…</p>
{:else}
	<ResultatExamen {bilan} officiel={null} sousTitre="Résultat de l’examen blanc" {blanc} {annonce} />
{/if}

<style>
	.etat {
		margin: 40px;
	}
</style>
