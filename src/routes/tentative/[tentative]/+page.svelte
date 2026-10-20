<script lang="ts">
	// Passation d'un examen officiel : l'écran commun d'examen, branché sur la tentative.
	import { page } from '$app/state';
	import PassationExamen from '#lib/components/PassationExamen.svelte';
	import { sourceTentative } from '#lib/data/examens-officiels.ts';

	const source = sourceTentative(page.params.tentative ?? '');
</script>

<PassationExamen {source} />
