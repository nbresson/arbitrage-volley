<script lang="ts">
	// Examen d'entraînement : l'écran commun d'examen, branché sur la séance (fonctions de la V1).
	import { page } from '$app/state';
	import PassationExamen, { type SourcePassation } from '#lib/components/PassationExamen.svelte';
	import { infoSeance, questionsDeSeance, signalerQuestion, terminerSeance, validerReponse } from '#lib/data/seances.ts';

	const seanceId = page.params.seance ?? '';

	const source: SourcePassation = {
		cleFile: `examen-${seanceId}`,
		titre: 'Examen d’entraînement',
		sousTitre: 'Sans correction avant la fin',
		urlResultat: `/examen-entrainement/${seanceId}/resultat`,
		async charger() {
			const [i, qs] = await Promise.all([infoSeance(seanceId), questionsDeSeance(seanceId)]);
			return {
				debut: i.debut,
				dureeMinutes: i.duree_minutes ?? 0,
				fin: i.fin,
				questions: qs.map((q) => ({
					questionId: q.question_id,
					theme: q.theme,
					enonce: q.enonce,
					propositions: q.propositions.map((p) => ({ valeur: p.id, lettre: p.lettre, texte: p.texte })),
					choisie: q.proposition_choisie,
					signalee: q.signalee
				}))
			};
		},
		async repondre(questionId, valeur, reponduLe) {
			await validerReponse(seanceId, questionId, valeur, reponduLe);
		},
		signaler: (questionId, signalee) => signalerQuestion(seanceId, questionId, signalee),
		async terminer() {
			await terminerSeance(seanceId);
		}
	};
</script>

<PassationExamen {source} />
