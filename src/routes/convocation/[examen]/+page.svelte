<script lang="ts">
	// Convocation imprimable, au format billet : une page qui s'imprime seule (ou s'enregistre en PDF).
	import '#lib/components/formulaire.css';
	import { page } from '$app/state';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { mesConvocations, type Convocation } from '#lib/data/examens-officiels.ts';
	import { pluriel } from '#lib/domain/texte.ts';
	import { dateHeure } from '#lib/examen-officiel/convocation.ts';
	import { session } from '#lib/session.svelte.ts';

	const examenId = page.params.examen ?? '';
	let c = $state<Convocation | null>(null);
	let etat = $state<'chargement' | 'pret' | 'introuvable' | 'erreur'>('chargement');

	$effect(() => {
		mesConvocations()
			.then((cs) => {
				c = cs.find((x) => x.examen_id === examenId) ?? null;
				etat = c ? 'pret' : 'introuvable';
			})
			.catch(() => (etat = 'erreur'));
	});
</script>

<svelte:head><title>{'Convocation'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Convocation">
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<main class="page">
	{#if etat === 'chargement'}
		<Chargement />
	{:else if etat === 'erreur'}
		<p class="message-erreur" role="alert">La convocation n’a pas pu être chargée. Vérifiez votre connexion puis rechargez la page.</p>
	{:else if !c}
		<h1>Convocation introuvable</h1>
		<p>Vous n’êtes pas inscrit à cet examen, ou il est clos. <a href="/">Retour à l’accueil</a></p>
	{:else}
		<div class="outils">
			<button class="btn" onclick={() => window.print()}>Imprimer la convocation</button>
			<a href="/">Retour à l’accueil</a>
		</div>
		<article class="billet" aria-labelledby="titre-billet">
			<header class="tete">
				<span class="marque">Arbitrage volley</span>
				<span>Convocation à l’examen officiel</span>
			</header>
			<h1 id="titre-billet">{c.titre}</h1>
			{#if session.profil}<p class="nom">{session.profil.prenom} {session.profil.nom}</p>{/if}
			<div class="perforation" aria-hidden="true"></div>
			<dl>
				<dt>Date</dt><dd>{dateHeure(c.date_heure)}</dd>
				{#if c.lieu}<dt>Lieu</dt><dd>{c.lieu}</dd>{/if}
				<dt>Durée</dt><dd>{c.duree_minutes} min{c.nb_questions ? ` · ${pluriel(c.nb_questions, 'question')}` : ''}</dd>
				{#if c.formateur}<dt>Formateur</dt><dd>{c.formateur}</dd>{/if}
			</dl>
			<p class="rappel">
				Le jour de l’examen, venez avec un téléphone ou un ordinateur chargé et connecté. Votre formateur donnera en salle le code d’accès à six chiffres. Une seule tentative, chronométrée.
			</p>
		</article>
	{/if}
</main>

<style>
	.page {
		max-width: 640px;
		margin: 0 auto;
		padding: 32px 20px 48px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.outils {
		display: flex;
		flex-wrap: wrap;
		gap: 12px 20px;
		align-items: center;
	}
	.billet {
		background: var(--papier);
		border: 1.5px solid var(--encre);
		border-radius: var(--r);
		overflow: hidden;
	}
	.tete {
		background: var(--tableau);
		color: var(--sur-fonce);
		padding: 14px 20px;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px 16px;
		font-size: 14px;
		font-weight: 600;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	.marque {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 18px;
	}
	h1 {
		margin: 0;
		padding: 20px 20px 4px;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 30px;
		line-height: 1.1;
	}
	.nom {
		margin: 0;
		padding: 0 20px 16px;
		font-size: 18px;
		font-weight: 600;
	}
	.perforation {
		margin: 0 16px;
		border-top: 2px dashed var(--filet);
	}
	dl {
		margin: 0;
		padding: 18px 20px;
		display: grid;
		grid-template-columns: 110px minmax(0, 1fr);
		gap: 10px 12px;
	}
	dt {
		color: var(--doux);
	}
	dd {
		margin: 0;
		font-weight: 600;
	}
	.rappel {
		margin: 0;
		padding: 0 20px 20px;
		color: var(--doux);
		line-height: 1.6;
	}
	@media print {
		:global(.bandeau),
		.outils {
			display: none !important;
		}
		.page {
			padding: 0;
		}
	}
</style>
