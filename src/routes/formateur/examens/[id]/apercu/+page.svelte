<script lang="ts">
	import MessageErreur from '#lib/components/MessageErreur.svelte';
	// Aperçu côté stagiaire : l'examen tel qu'il s'affichera, question par question. Rien n'est enregistré.
	import '#lib/components/formulaire.css';
	import { page } from '$app/state';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	import Etiquette from '#lib/components/Etiquette.svelte';
	import FilAriane from '#lib/components/FilAriane.svelte';
	import GrilleQuestions from '#lib/components/GrilleQuestions.svelte';
	import NavFormateur from '#lib/components/NavFormateur.svelte';
	import Reponse from '#lib/components/Reponse.svelte';
	import { apercuExamen, lireExamen, type QuestionApercu } from '#lib/data/examens-formateur.ts';
	import { SvelteSet } from 'svelte/reactivity';

	const id = page.params.id ?? '';
	let titre = $state('');
	let duree = $state(0);
	let questions = $state<QuestionApercu[]>([]);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	let courant = $state(1);
	let choix = $state<Record<number, string>>({});
	const vides = new SvelteSet<number>();

	$effect(() => {
		Promise.all([lireExamen(id), apercuExamen(id)])
			.then(([e, qs]) => ((titre = e.titre), (duree = e.duree_minutes), (questions = qs), (etat = 'pret')))
			.catch(() => (etat = 'erreur'));
	});

	const q = $derived(questions[courant - 1]);
	const repondues = $derived(new Set(Object.keys(choix).map(Number)));
</script>

<svelte:head><title>{`Aperçu · ${titre || 'Examen'}`} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Espace formateur">
	{#snippet navigation()}<NavFormateur />{/snippet}
</Bandeau>

<main class="page">
	<FilAriane etapes={[{ libelle: 'Examens officiels', href: '/formateur/examens' }, { libelle: titre || 'Examen', href: `/formateur/examens/${id}` }, { libelle: 'Aperçu côté stagiaire' }]} />
	{#if etat === 'pret'}
		<p class="bandeau-apercu" role="note">Aperçu : c’est l’écran que verront les stagiaires ({questions.length} question{questions.length > 1 ? 's' : ''}, {duree} minutes). Vous pouvez cocher des réponses pour essayer, rien n’est enregistré.</p>
	{/if}

	{#if etat === 'chargement'}
		<Chargement />
	{:else if etat === 'erreur'}
		<MessageErreur texte="L’aperçu n’a pas pu être chargé." />
	{:else if !q}
		<p>Cet examen n’a pas encore de question. <a href="/formateur/examens/{id}">Choisir les questions</a></p>
	{:else}
		<div class="jeu">
			<section class="situation">
				<div class="meta"><Etiquette>{q.theme}</Etiquette><span class="aide">Question {courant} sur {questions.length} · une seule réponse possible</span></div>
				<h1 id="enonce">{q.enonce}</h1>
				<fieldset aria-describedby="enonce">
					<legend class="vh">Propositions de réponse</legend>
					{#each q.propositions as p (p.lettre)}
						<Reponse nom="apercu-{courant}" valeur={p.lettre} lettre={p.lettre} texte={p.texte} choisie={choix[courant] === p.lettre} desactivee={false} onchoisir={(v) => (choix[courant] = v)} />
					{/each}
				</fieldset>
				<div class="actions">
					<button class="btn2" disabled={courant === 1} onclick={() => courant--}>Question précédente</button>
					<button class="btn" disabled={courant === questions.length} onclick={() => courant++}>Question suivante</button>
				</div>
			</section>
			<aside class="cote">
				<h2>Les questions</h2>
				<GrilleQuestions total={questions.length} {courant} {repondues} signalees={vides} onaller={(n) => (courant = n)} />
				<a class="btn2" href="/formateur/examens/{id}">Revenir à l’examen</a>
			</aside>
		</div>
	{/if}
</main>

<style>
	.page {
		padding: 24px 40px 48px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		max-width: 1200px;
	}
	.bandeau-apercu {
		margin: 0;
		background: var(--ambre-clair);
		color: var(--ambre);
		border: 1px solid var(--ambre-vif);
		border-radius: var(--r);
		padding: 12px 16px;
		font-weight: 600;
	}
	.jeu {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
	}
	.situation {
		flex: 999 1 520px;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.meta,
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
	}
	.aide {
		color: var(--doux);
		font-size: 14px;
	}
	h1 {
		margin: 0;
		font-size: 27px;
		line-height: 1.38;
		font-weight: 600;
		max-width: 31em;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-width: 46em;
	}
	.cote {
		flex: 1 1 300px;
		max-width: 420px;
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		align-self: flex-start;
	}
	h2 {
		margin: 0;
		font-size: 20px;
	}
	@media (max-width: 700px) {
		.page {
			padding: 20px 16px;
		}
	}
</style>
