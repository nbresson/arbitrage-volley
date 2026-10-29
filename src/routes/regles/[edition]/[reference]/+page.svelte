<script lang="ts">
	import '#lib/components/formulaire.css';
	import CartonsSanction from '#lib/components/CartonsSanction.svelte';
	import { page } from '$app/state';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { memoriserConsultation, slug, toutesLesRegles, urlRegle } from '#lib/data/regles.ts';
	import type { Regle } from '#lib/regles/arbre.ts';

	let regles = $state<Regle[]>([]);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');

	$effect(() => {
		toutesLesRegles()
			.then((r) => ((regles = r), (etat = 'pret')))
			.catch(() => (etat = 'erreur'));
	});

	const reference = $derived(decodeURIComponent(page.params.reference ?? ''));
	const regle = $derived(regles.find((r) => slug(r.edition) === page.params.edition && r.reference === reference));
	const edition = $derived(regle ? regles.filter((r) => r.edition === regle.edition) : []);
	const renvois = $derived(
		(regle?.renvois ?? []).map((ref) => ({ ref, cible: regles.find((r) => r.source === 'fivb_regles' && r.reference === ref) }))
	);

	$effect(() => {
		if (regle) memoriserConsultation(regle);
	});

	const parent = $derived(regle?.parent_reference ? edition.find((r) => r.reference === regle.parent_reference) : undefined);
	const enfants = $derived(regle ? edition.filter((r) => r.parent_reference === regle.reference) : []);
</script>

<Bandeau titre="Arbitrage volley" sousTitre="Règles et interprétations">
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<main class="page">
	<nav class="fil" aria-label="Fil d’Ariane"><a href="/regles">Règles</a> › {regle?.edition ?? ''} › {reference}</nav>

	{#if etat === 'chargement'}
		<p role="status">Chargement…</p>
	{:else if etat === 'erreur'}
		<p class="message-erreur" role="alert">La règle n’a pas pu être chargée. Vérifiez votre connexion puis rechargez la page.</p>
	{:else if !regle}
		<p>Cette règle n’existe pas dans les éditions en vigueur. <a href="/regles">Retour aux règles</a></p>
	{:else}
		<article class="fiche papier-reglement">
			<h1><span class="ref plaque">{regle.reference}</span> {regle.titre ?? ''}</h1>
			<p class="edition">{regle.edition}</p>
			{#if regle.texte}<div class="texte">{regle.texte}</div><CartonsSanction texte={regle.texte} />{/if}

			{#if regle.source === 'casebook'}
				<p class="mention">
					Traduction française non officielle : en cas de divergence, le texte anglais du Casebook FIVB fait foi.
				</p>
				{#if regle.texte_original}
					<details>
						<summary>Texte original (anglais)</summary>
						<div class="texte original">{regle.texte_original}</div>
					</details>
				{/if}
			{/if}

			{#if regle.video_url}
				<p><a href={regle.video_url} target="_blank" rel="noopener">Voir la vidéo FIVB du cas (nouvel onglet)</a></p>
			{/if}

			{#if renvois.length}
				<section>
					<h2>Voir aussi</h2>
					<ul class="renvois">
						{#each renvois as r (r.ref)}
							<li>{#if r.cible}<a href={urlRegle(r.cible)} class="ref plaque">{r.ref}</a>{:else}<span class="ref plaque">{r.ref}</span>{/if}</li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if parent || enfants.length}
				<section>
					<h2>Dans le règlement</h2>
					{#if parent}<p>Article parent : <a href={urlRegle(parent)} class="ref plaque">{parent.reference}</a> {parent.titre ?? ''}</p>{/if}
					{#if enfants.length}
						<ul class="renvois">
							{#each enfants as e (e.id)}<li><a href={urlRegle(e)} class="ref plaque">{e.reference}</a></li>{/each}
						</ul>
					{/if}
				</section>
			{/if}

			<a class="btn" href="/entrainement/nouvelle?regle={encodeURIComponent(regle.id)}">S’entraîner sur cette règle</a>
		</article>
	{/if}
</main>

<style>
	.page {
		max-width: 820px;
		margin: 0 auto;
		padding: 28px 20px 48px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.fil {
		font-size: 14px;
		color: var(--doux);
	}
	.fiche {
		background-color: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 28px 32px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	h1 {
		margin: 0;
		font-size: 24px;
		font-weight: 700;
	}
	h2 {
		margin: 0 0 8px;
		font-size: 16px;
	}
	h1 .ref {
		font-size: 30px;
	}
	.edition {
		margin: -8px 0 0;
		color: var(--doux);
		font-size: 14px;
	}
	.texte {
		font-size: 17px;
		line-height: 1.65;
		white-space: pre-line;
		max-width: 68ch;
	}
	.original {
		margin-top: 10px;
		color: var(--doux);
		font-size: 15px;
	}
	.mention {
		margin: 0;
		font-size: 14px;
		color: var(--ambre);
		background: var(--ambre-clair);
		border-radius: var(--r);
		padding: 10px 12px;
	}
	.renvois {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 8px 16px;
	}
	.btn {
		align-self: flex-start;
	}
</style>
