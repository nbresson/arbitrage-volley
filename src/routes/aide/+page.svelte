<script lang="ts">
	import { CONTACT_EMAIL, lienContact } from '#lib/config.ts';
	// Aide : les trois façons de s'entraîner, les raccourcis clavier, les questions fréquentes, le contact.
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { RACCOURCIS } from '#lib/raccourcis-globaux.ts';

	const questions = [
		{
			q: 'Mes réponses sont-elles vues par mon formateur ?',
			r: 'Vos séances pédagogiques et vos examens officiels, oui : c’est ce qui lui permet de vous aider. Vos examens blancs restent privés.'
		},
		{
			q: 'Que se passe-t-il si la connexion coupe pendant un examen ?',
			r: 'Vos réponses restent sur l’appareil et partent dès le retour du réseau. Un bandeau indique combien de réponses attendent. Si la page se ferme, revenez sur l’examen avec le même code : le chronomètre ne repart pas de zéro.'
		},
		{
			q: 'Je me suis trompé de réponse en mode pédagogique : est-ce grave ?',
			r: 'Non. Une question ratée passe « à revoir ». Le bouton « Revoir mes erreurs » la repropose, et elle redevient « acquise » dès que vous y répondez juste.'
		},
		{
			q: 'Une question me semble fausse ou mal posée.',
			r: 'Après la correction, le lien « Signaler un problème » prévient les formateurs. Ils corrigent la question ou vous répondent.'
		},
		{
			q: 'Quel est le seuil de réussite ?',
			r: 'Il est fixé par vos formateurs pour chaque examen officiel. L’examen blanc indique si vous auriez réussi avec un seuil de 70 %.'
		}
	];
</script>

<svelte:head><title>{'Aide'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Aide">
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<main class="page">
	<h1 class="titre-page"><span class="surtitre">Mon compte</span>Aide</h1>

	<section class="carte">
		<h2>Trois façons de s’entraîner</h2>
		<dl class="modes">
			<dt>Mode pédagogique</dt>
			<dd>Une question à la fois. Après chaque réponse : la correction, l’explication et la règle qui la fonde. Idéal pour apprendre.</dd>
			<dt>Examen blanc</dt>
			<dd>Les conditions de l’examen : chronométré, sans correction avant la fin. Le score par thème montre où retravailler, et vous pouvez ensuite revoir l’examen avec la correction.</dd>
			<dt>Examen officiel</dt>
			<dd>Le jour J, en salle. Votre formateur donne un code à six chiffres. Une seule tentative ; le résultat est transmis à vos formateurs.</dd>
		</dl>
	</section>

	<section class="carte">
		<h2>Raccourcis clavier</h2>
		{#each RACCOURCIS as g (g.groupe)}
			<h3>{g.groupe}</h3>
			<dl class="raccourcis">
				{#each g.raccourcis as r (r.touches)}<dt><kbd>{r.touches}</kbd></dt><dd>{r.action}</dd>{/each}
			</dl>
		{/each}
	</section>

	<section class="carte">
		<h2>Questions fréquentes</h2>
		{#each questions as x (x.q)}
			<details>
				<summary>{x.q}</summary>
				<p>{x.r}</p>
			</details>
		{/each}
	</section>

	<section class="carte">
		<h2>Contact</h2>
		<p>Pour une question sur la formation, un examen ou votre compte, adressez-vous à votre formateur, ou écrivez à <a href={lienContact}>{CONTACT_EMAIL}</a>.</p>
	</section>
</main>

<style>
	.page {
		max-width: 820px;
		margin: 0 auto;
		padding: 32px 20px 48px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.carte {
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	h2 {
		margin: 0;
		font-size: 20px;
	}
	h3 {
		margin: 4px 0 0;
		font-size: 15px;
		color: var(--doux);
	}
	p {
		margin: 0;
		line-height: 1.6;
	}
	dl {
		margin: 0;
	}
	.modes dt {
		font-weight: 700;
		margin-top: 8px;
	}
	.modes dd {
		margin: 2px 0 0;
		line-height: 1.6;
	}
	.raccourcis {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 8px 14px;
		align-items: center;
	}
	.raccourcis dd {
		margin: 0;
	}
	kbd {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 14px;
		border: 1.5px solid var(--filet);
		border-bottom-width: 3px;
		border-radius: var(--r-petit);
		padding: 2px 8px;
		white-space: nowrap;
	}
	details {
		border-top: 1px solid var(--filet-doux);
		padding: 10px 0;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
		min-height: 32px;
		display: flex;
		align-items: center;
	}
	details p {
		margin-top: 6px;
	}
</style>
