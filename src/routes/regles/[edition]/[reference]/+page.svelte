<script lang="ts">
	import MessageErreur from '#lib/components/MessageErreur.svelte';
	// Fiche d'une règle : texte (avec le glossaire), sommaire collant du chapitre, précédente et suivante,
	// questions liées, Casebook en regard, figures, marque-page et impression.
	import '#lib/components/formulaire.css';
	import { page } from '$app/state';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import CartonsSanction from '#lib/components/CartonsSanction.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	import FilAriane from '#lib/components/FilAriane.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import {
		epingler,
		figures as lireFigures,
		glossaire,
		memoriserConsultation,
		mesEpingles,
		nbQuestionsRegle,
		slug,
		toutesLesRegles,
		urlRegle,
		type Figure,
		type Terme
	} from '#lib/data/regles.ts';
	import { pluriel, titreLisible } from '#lib/domain/texte.ts';
	import { comparerReferences, type Regle } from '#lib/regles/arbre.ts';
	import { chapitre, cleFigure, segmentsGlossaire, vueDeSource, voisines } from '#lib/regles/lecture.ts';

	let regles = $state<Regle[]>([]);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	let termes = $state<Terme[]>([]);
	let lesFigures = $state<Figure[]>([]);
	let epinglees = $state<string[]>([]);
	let nbQuestions = $state<number | null | 'erreur'>(null);
	// Glossaire : un terme ouvert à la fois (au clic ou au toucher), fermé par Échap ou un clic ailleurs.
	let termeOuvert = $state<number | null>(null);
	let bulleADroite = $state(false);
	function basculerTerme(i: number, e: MouseEvent) {
		e.stopPropagation();
		const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
		bulleADroite = b.left > window.innerWidth / 2;
		termeOuvert = termeOuvert === i ? null : i;
	}
	let erreurEpingle = $state('');
	// Sur grand écran, le sommaire est ouvert et le Casebook s'affiche en regard ; sur téléphone, à la demande.
	const large = typeof matchMedia === 'function' && matchMedia('(min-width: 1000px)').matches;
	let enRegard = $state(large);

	$effect(() => {
		toutesLesRegles()
			.then((r) => ((regles = r), (etat = 'pret')))
			.catch(() => (etat = 'erreur'));
		glossaire().then((g) => (termes = g));
		lireFigures().then((f) => (lesFigures = f));
		mesEpingles()
			.then((e) => (epinglees = e))
			.catch(() => {});
	});

	const reference = $derived(decodeURIComponent(page.params.reference ?? ''));
	const regle = $derived(regles.find((r) => slug(r.edition) === page.params.edition && r.reference === reference));
	const edition = $derived(regle ? regles.filter((r) => r.edition === regle.edition) : []);
	const figuresParRef = $derived(new Map(lesFigures.map((f) => [f.reference, f])));
	const renvois = $derived(
		(regle?.renvois ?? []).map((ref) => {
			const fig = cleFigure(ref);
			return {
				ref,
				fig,
				figure: fig ? figuresParRef.get(fig.reference) : undefined,
				cible: regles.find((r) => r.source === 'fivb_regles' && r.reference === ref)
			};
		})
	);
	const sommaire = $derived(regle ? chapitre(edition, regle) : []);
	const autour = $derived(regle ? voisines(edition, regle) : { precedente: null, suivante: null });
	const racine = $derived(sommaire[0]?.regle);
	const epinglee = $derived(!!regle && epinglees.includes(regle.id));
	const segments = $derived(regle?.texte ? segmentsGlossaire(regle.texte.trim(), termes) : []);
	const enRegardActif = $derived(!!regle && regle.source === 'casebook' && !!regle.texte_original && enRegard);

	$effect(() => {
		if (!regle) return;
		memoriserConsultation(regle);
		compterQuestions(regle.id);
	});

	function compterQuestions(id: string) {
		nbQuestions = null;
		nbQuestionsRegle(id)
			.then((n) => (nbQuestions = n))
			.catch(() => (nbQuestions = 'erreur'));
	}

	async function basculerEpingle() {
		if (!regle) return;
		const id = regle.id;
		const avant = epinglees;
		erreurEpingle = '';
		epinglees = avant.includes(id) ? avant.filter((x) => x !== id) : [id, ...avant];
		try {
			await epingler(id, !avant.includes(id));
		} catch {
			epinglees = avant;
			erreurEpingle = 'Le marque-page n’a pas pu être enregistré. Vérifiez votre connexion.';
		}
	}

	const parent = $derived(regle?.parent_reference ? edition.find((r) => r.reference === regle.parent_reference) : undefined);
	const enfants = $derived(
		regle ? edition.filter((r) => r.parent_reference === regle.reference).sort((a, b) => comparerReferences(a.reference, b.reference)) : []
	);
	// Le fil d'Ariane ramène à la liste sur la bonne source (un cas du Casebook → onglet Casebook).
	const vueListe = $derived(regle ? `/regles?vue=${vueDeSource(regle.source)}` : '/regles');
	const etapes = $derived([
		{ libelle: 'Règles', href: vueListe },
		...(regle ? [{ libelle: regle.edition, href: vueListe }] : []),
		...(racine && regle && racine.id !== regle.id
			? [{ libelle: `${racine.source === 'casebook' ? '' : 'Chapitre '}${racine.reference}`, href: urlRegle(racine) }]
			: []),
		{ libelle: reference }
	]);
</script>

<svelte:window
	onkeydown={(e) => e.key === 'Escape' && (termeOuvert = null)}
	onclick={() => (termeOuvert = null)}
/>

<svelte:head><title>{`Règle ${reference}${regle?.titre ? ` · ${titreLisible(regle.titre)}` : ''}`} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Règles et interprétations">
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<div class="cadre">
	{#if regle && sommaire.length > 1}
		<details class="sommaire" open={large}>
			<summary>Sommaire : {racine?.source === 'casebook' ? '' : 'chapitre '}{racine?.reference}</summary>
			<nav aria-label="Sommaire du chapitre">
				<ul>
					{#each sommaire as l (l.regle.id)}
						<li style:padding-left="{l.profondeur * 12}px">
							<a href={urlRegle(l.regle)} aria-current={l.regle.id === regle.id ? 'page' : undefined}>
								<span class="num">{l.regle.reference}</span>{titreLisible(l.regle.titre) || l.regle.texte.slice(0, 40)}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
		</details>
	{/if}

	<main class="page">
		<FilAriane {etapes} />

		{#if etat === 'chargement'}
			<Chargement />
		{:else if etat === 'erreur'}
			<MessageErreur texte="La règle n’a pas pu être chargée." />
		{:else if !regle}
			<p>Cette règle n’existe pas dans les éditions en vigueur. <a href="/regles">Retour aux règles</a></p>
		{:else}
			<article class="fiche papier-reglement">
				<h1><span class="ref plaque">{regle.reference}</span> {titreLisible(regle.titre)}</h1>
				<p class="edition">{regle.edition}</p>

				<div class="outils">
					<button type="button" class="btn2" aria-pressed={epinglee} onclick={basculerEpingle}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill={epinglee ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
						Épingler
					</button>
					<button type="button" class="btn2" onclick={() => window.print()}>Imprimer</button>
					{#if regle.source === 'casebook' && regle.texte_original}
						<button type="button" class="btn2" aria-pressed={enRegard} onclick={() => (enRegard = !enRegard)}>Texte anglais en regard</button>
					{/if}
				</div>
				{#if erreurEpingle}<p class="message-erreur" role="alert">{erreurEpingle}</p>{/if}

				{#if regle.texte}
					<div class="textes" class:en-regard={enRegardActif}>
						<div>
							{#if enRegardActif}<p class="langue">Traduction française</p>{/if}
							<blockquote class="texte extrait-reglement">
								«&nbsp;{#each segments as seg, i (i)}{#if seg.definition}<span class="terme"><button type="button" aria-expanded={termeOuvert === i} aria-controls="def-{i}" onclick={(e) => basculerTerme(i, e)}>{seg.texte}</button>{#if termeOuvert === i}<span class="bulle" class:droite={bulleADroite} role="tooltip" id="def-{i}">{seg.definition}</span>{/if}</span>{:else}{seg.texte}{/if}{/each}&nbsp;»
							</blockquote>
						</div>
						{#if enRegardActif}
							<div lang="en">
								<p class="langue">Original text (English)</p>
								<blockquote class="texte original">{regle.texte_original}</blockquote>
							</div>
						{/if}
					</div>
					<CartonsSanction texte={regle.texte} />
				{/if}

				{#if regle.source === 'casebook'}
					<p class="mention">Traduction française non officielle : en cas de divergence, le texte anglais du Casebook FIVB fait foi.</p>
				{/if}

				{#if regle.video_url}
					<p><a href={regle.video_url} target="_blank" rel="noopener">Voir la vidéo FIVB du cas (nouvel onglet)</a></p>
				{/if}

				{#if renvois.length}
					<section>
						<h2>Voir aussi</h2>
						<ul class="renvois">
							{#each renvois as r (r.ref)}
								<li>
									{#if r.cible}
										<a href={urlRegle(r.cible)} class="ref plaque">{r.ref}</a>
										<span class="intitule">{titreLisible(r.cible.titre) || r.cible.texte.slice(0, 60)}</span>
									{:else if r.fig && r.figure?.image_url}
										<figure>
											<img src={r.figure.image_url} alt={r.figure.legende || r.fig.libelle} loading="lazy" />
											<figcaption><span class="ref plaque">{r.ref}</span> {r.figure.legende}</figcaption>
										</figure>
									{:else if r.fig}
										<span class="ref plaque">{r.ref}</span>
										<span class="intitule">{r.fig.libelle} du règlement{r.figure?.legende ? ` : ${r.figure.legende}` : ' (image à venir)'}</span>
									{:else}
										<span class="ref plaque">{r.ref}</span> <span class="intitule">Article absent de cette édition</span>
									{/if}
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if parent || enfants.length}
					<section>
						<h2>Dans le règlement</h2>
						{#if parent}<p>Article parent : <a href={urlRegle(parent)} class="ref plaque">{parent.reference}</a> {titreLisible(parent.titre)}</p>{/if}
						{#if enfants.length}
							<ul class="renvois">
								{#each enfants as e (e.id)}<li><a href={urlRegle(e)} class="ref plaque">{e.reference}</a> <span class="intitule">{titreLisible(e.titre) || e.texte.slice(0, 60)}</span></li>{/each}
							</ul>
						{/if}
					</section>
				{/if}

				<section class="entrainement">
					<h2>S’entraîner</h2>
					{#if nbQuestions === 'erreur'}
						<MessageErreur texte="Les questions liées n’ont pas pu être comptées." onreessayer={() => compterQuestions(regle.id)} />
						<a href="/entrainement/nouvelle?regle={encodeURIComponent(regle.id)}">S’entraîner sur cette règle</a>
					{:else if nbQuestions === null}
						<p class="aide">Recherche des questions liées…</p>
					{:else if nbQuestions > 0}
						<p>{nbQuestions > 1 ? `${nbQuestions} questions citent cette règle.` : 'Une question cite cette règle.'}</p>
						<a class="btn" href="/entrainement/nouvelle?regle={encodeURIComponent(regle.id)}">S’entraîner sur {nbQuestions > 1 ? `ces ${pluriel(nbQuestions, 'question')}` : 'cette question'}</a>
					{:else}
						<p class="aide">Aucune question ne cite encore cette règle.</p>
					{/if}
				</section>
			</article>

			<nav class="voisines" aria-label="Règles voisines">
				{#if autour.precedente}
					<a href={urlRegle(autour.precedente)} rel="prev"><span class="sens">Précédente</span> <span><span class="ref">{autour.precedente.reference}</span> {titreLisible(autour.precedente.titre)}</span></a>
				{:else}<span></span>{/if}
				{#if autour.suivante}
					<a href={urlRegle(autour.suivante)} rel="next" class="suivante"><span class="sens">Suivante</span> <span><span class="ref">{autour.suivante.reference}</span> {titreLisible(autour.suivante.titre)}</span></a>
				{/if}
			</nav>
		{/if}
	</main>
</div>

<style>
	.cadre {
		max-width: 1180px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0 28px;
		padding: 0 20px;
	}
	.page {
		min-width: 0;
		max-width: 820px;
		width: 100%;
		margin: 0 auto;
		padding: 28px 0 48px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	/* Sommaire du chapitre : collant à gauche sur grand écran, repliable au-dessus de la fiche sur téléphone. */
	.sommaire {
		margin-top: 28px;
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 12px 14px;
		font-size: 14px;
	}
	.sommaire summary {
		cursor: pointer;
		font-weight: 700;
		min-height: 32px;
		display: flex;
		align-items: center;
	}
	.sommaire ul {
		list-style: none;
		margin: 8px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.sommaire a {
		display: block;
		padding: 10px 8px;
		border-radius: var(--r-petit);
		color: var(--encre);
		text-decoration: none;
		line-height: 1.35;
	}
	.sommaire a:hover {
		background: var(--ligne-survol);
	}
	.sommaire a[aria-current='page'] {
		background: var(--tableau);
		color: var(--sur-fonce);
	}
	.sommaire .num {
		font-family: var(--police-chiffres);
		font-weight: 800;
		margin-right: 6px;
	}
	@media (min-width: 1000px) {
		.cadre {
			grid-template-columns: 280px minmax(0, 1fr);
		}
		.sommaire {
			position: sticky;
			top: 16px;
			align-self: start;
			max-height: calc(100vh - 32px);
			overflow: auto;
		}
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
	.outils {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.outils .btn2 {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.outils [aria-pressed='true'] {
		border-color: var(--trait);
		background: var(--ligne-survol);
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
	.textes.en-regard {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 20px;
	}
	.textes.en-regard .original {
		margin: 0;
	}
	.langue {
		margin: 0 0 6px;
		font-size: 13px;
		font-weight: 700;
		color: var(--doux);
	}
	.terme {
		position: relative;
	}
	.terme button {
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		padding: 0;
		cursor: help;
		text-decoration: underline dotted var(--bleu);
		text-underline-offset: 3px;
	}
	.bulle {
		position: absolute;
		left: 0;
		top: calc(100% + 6px);
		z-index: 5;
		width: max-content;
		max-width: min(320px, 80vw);
		background: var(--tableau);
		color: var(--sur-fonce);
		font-size: 14px;
		line-height: 1.5;
		font-style: normal;
		white-space: normal;
		padding: 8px 10px;
		border-radius: var(--r-petit);
	}
	.bulle.droite {
		left: auto;
		right: 0;
	}
	.mention {
		margin: 0;
		font-size: 14px;
		color: var(--ambre);
		background: var(--ambre-clair);
		border-radius: var(--r);
		padding: 10px 12px;
	}
	/* Un renvoi par ligne : le numéro en plaque, puis son intitulé, pour savoir où mène le lien. */
	.renvois {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.intitule {
		color: var(--doux);
	}
	figure {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	figure img {
		max-width: 100%;
		height: auto;
		border: 1px solid var(--filet);
		border-radius: var(--r-petit);
		background: var(--papier);
	}
	.entrainement {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		border-top: 1px solid var(--filet);
		padding-top: 16px;
	}
	.entrainement p {
		margin: 0;
	}
	.aide {
		color: var(--doux);
	}
	.voisines {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}
	.voisines a {
		flex: 1 1 240px;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px 14px;
		min-height: 44px;
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		color: var(--encre);
		text-decoration: none;
	}
	.voisines a:hover {
		border-color: var(--trait);
	}
	.voisines .suivante {
		text-align: right;
		margin-left: auto;
	}
	.sens {
		font-size: 13px;
		color: var(--doux);
	}
	.voisines .ref {
		font-family: var(--police-chiffres);
		font-weight: 800;
	}
	@media (max-width: 600px) {
		.cadre {
			padding: 0 12px;
		}
		.fiche {
			padding: 20px 16px;
		}
	}
	/* Version imprimable : la fiche seule, avec la référence et l'édition. */
	@media print {
		:global(.bandeau),
		:global(.fil),
		.sommaire,
		.outils,
		.voisines,
		.entrainement {
			display: none !important;
		}
		.cadre {
			display: block;
			padding: 0;
		}
		.fiche {
			border: 0;
			padding: 0;
		}
		.bulle {
			display: none !important;
		}
		.terme button {
			text-decoration: none;
		}
	}
</style>
