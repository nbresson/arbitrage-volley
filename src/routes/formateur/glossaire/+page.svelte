<script lang="ts">
	// Glossaire (termes expliqués au survol dans les règles) et figures du règlement (image et légende).
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	import EtatVide from '#lib/components/EtatVide.svelte';
	import FilAriane from '#lib/components/FilAriane.svelte';
	import NavFormateur from '#lib/components/NavFormateur.svelte';
	import {
		enregistrerFigure,
		enregistrerTerme,
		figures as lireFigures,
		glossaire,
		supprimerFigure,
		supprimerTerme,
		type Figure,
		type Terme
	} from '#lib/data/regles.ts';

	let termes = $state<Terme[]>([]);
	let lesFigures = $state<Figure[]>([]);
	let etat = $state<'chargement' | 'pret'>('chargement');
	let t = $state<{ id?: string; terme: string; definition: string }>({ terme: '', definition: '' });
	let erreurTerme = $state('');
	let messageTerme = $state('');
	let f = $state<Figure>({ reference: '', legende: '', image_url: '' });
	let erreurFigure = $state('');
	let messageFigure = $state('');

	async function charger() {
		[termes, lesFigures] = await Promise.all([glossaire(true), lireFigures()]);
		lesFigures.sort((a, b) => a.reference.localeCompare(b.reference, 'fr', { numeric: true }));
		etat = 'pret';
	}
	$effect(() => {
		charger();
	});

	async function validerTerme(e: SubmitEvent) {
		e.preventDefault();
		erreurTerme = messageTerme = '';
		if (t.terme.trim().length < 2) return void (erreurTerme = 'Le terme doit faire au moins deux lettres.');
		if (t.definition.trim().length < 5) return void (erreurTerme = 'Écrivez une définition courte, en une ou deux phrases.');
		try {
			await enregistrerTerme(t);
			messageTerme = `« ${t.terme.trim()} » enregistré.`;
			t = { terme: '', definition: '' };
			await charger();
		} catch (err) {
			erreurTerme = (err as Error).message || 'Le terme n’a pas pu être enregistré. Réessayez.';
		}
	}

	async function retirerTerme(x: Terme) {
		erreurTerme = messageTerme = '';
		try {
			await supprimerTerme(x.id);
			messageTerme = `« ${x.terme} » retiré du glossaire.`;
			await charger();
		} catch {
			erreurTerme = 'Le terme n’a pas pu être retiré. Réessayez.';
		}
	}

	async function validerFigure(e: SubmitEvent) {
		e.preventDefault();
		erreurFigure = messageFigure = '';
		if (!/^Fig\.\d+[a-z]?$/.test(f.reference.trim())) return void (erreurFigure = 'La référence s’écrit comme dans le règlement : Fig.9, Fig.1a…');
		if (f.image_url && !/^https:\/\//.test(f.image_url.trim())) return void (erreurFigure = 'L’adresse de l’image commence par https://');
		try {
			await enregistrerFigure(f);
			messageFigure = `${f.reference.trim()} enregistrée.`;
			f = { reference: '', legende: '', image_url: '' };
			await charger();
		} catch (err) {
			erreurFigure = (err as Error).message || 'La figure n’a pas pu être enregistrée. Réessayez.';
		}
	}

	async function retirerFigure(x: Figure) {
		erreurFigure = messageFigure = '';
		try {
			await supprimerFigure(x.reference);
			messageFigure = `${x.reference} retirée.`;
			await charger();
		} catch {
			erreurFigure = 'La figure n’a pas pu être retirée. Réessayez.';
		}
	}
</script>

<svelte:head><title>{'Glossaire et figures'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Espace formateur">
	{#snippet navigation()}<NavFormateur />{/snippet}
</Bandeau>

<main class="page">
	<FilAriane etapes={[{ libelle: 'Espace formateur', href: '/formateur/questions' }, { libelle: 'Règles', href: '/formateur/regles' }, { libelle: 'Glossaire et figures' }]} />
	<h1 class="titre-page"><span class="surtitre">Règles</span>Glossaire et figures</h1>

	{#if etat === 'chargement'}
		<Chargement />
	{:else}
		<section class="bloc">
			<h2>Glossaire <span class="compte">{termes.length}</span></h2>
			<p class="aide">Dans le texte des règles, la première apparition de chaque terme est soulignée en pointillés : la définition s’affiche au survol ou au toucher.</p>
			<form onsubmit={validerTerme} novalidate>
				<div class="ligne">
					<label class="champ court">Terme<input bind:value={t.terme} autocomplete="off" placeholder="ex. libéro" /></label>
					<label class="champ">Définition<textarea bind:value={t.definition} rows="2"></textarea></label>
				</div>
				{#if erreurTerme}<p class="message-erreur" role="alert">{erreurTerme}</p>{/if}
				{#if messageTerme}<p class="message-info" role="status">{messageTerme}</p>{/if}
				<div class="actions">
					<button class="btn" type="submit">{t.id ? 'Enregistrer la modification' : 'Ajouter au glossaire'}</button>
					{#if t.id}<button type="button" class="btn2" onclick={() => (t = { terme: '', definition: '' })}>Annuler</button>{/if}
				</div>
			</form>
			{#if termes.length}
				<ul class="liste">
					{#each termes as x (x.id)}
						<li>
							<span><b>{x.terme}</b> — {x.definition}</span>
							<span class="outils">
								<button class="lien" onclick={() => (t = { ...x })} aria-label="Modifier « {x.terme} »">Modifier</button>
								<button class="lien" onclick={() => retirerTerme(x)} aria-label="Retirer « {x.terme} »">Retirer</button>
							</span>
						</li>
					{/each}
				</ul>
			{:else}
				<EtatVide titre="Glossaire vide" texte="Ajoutez les termes techniques que les stagiaires découvrent : libéro, pénétration, rotation…" niveau={3} />
			{/if}
		</section>

		<section class="bloc">
			<h2>Figures du règlement <span class="compte">{lesFigures.length}</span></h2>
			<p class="aide">Les règles renvoient à des figures (Fig.1a, Fig.9…). Déposez l’image sur un espace en ligne et collez ici son adresse en https : elle s’affichera dans « Voir aussi », avec sa légende.</p>
			<form onsubmit={validerFigure} novalidate>
				<div class="ligne">
					<label class="champ court">Référence<input bind:value={f.reference} autocomplete="off" placeholder="Fig.9" /></label>
					<label class="champ">Légende<input bind:value={f.legende} autocomplete="off" placeholder="ex. Positions des joueurs au service" /></label>
				</div>
				<label class="champ">Adresse de l’image (facultative)<input type="url" bind:value={f.image_url} placeholder="https://…" /></label>
				{#if erreurFigure}<p class="message-erreur" role="alert">{erreurFigure}</p>{/if}
				{#if messageFigure}<p class="message-info" role="status">{messageFigure}</p>{/if}
				<button class="btn" type="submit">Enregistrer la figure</button>
			</form>
			{#if lesFigures.length}
				<ul class="liste">
					{#each lesFigures as x (x.reference)}
						<li>
							<span><b>{x.reference}</b> — {x.legende || 'sans légende'}{x.image_url ? '' : ' · image à fournir'}</span>
							<span class="outils">
								<button class="lien" onclick={() => (f = { ...x, image_url: x.image_url ?? '' })} aria-label="Modifier {x.reference}">Modifier</button>
								<button class="lien" onclick={() => retirerFigure(x)} aria-label="Retirer {x.reference}">Retirer</button>
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</main>

<style>
	.page {
		padding: 28px 40px 48px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 1000px;
	}
	.bloc {
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	h2 {
		margin: 0;
		font-size: 20px;
		display: flex;
		align-items: baseline;
		gap: 12px;
	}
	.compte {
		font-size: 14px;
		color: var(--doux);
	}
	.aide {
		margin: 0;
		color: var(--doux);
		line-height: 1.5;
	}
	form {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}
	form .champ {
		width: 100%;
	}
	.ligne {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		width: 100%;
	}
	.ligne .champ {
		flex: 1 1 320px;
	}
	.ligne .champ.court {
		flex: 0 1 200px;
	}
	.actions {
		display: flex;
		gap: 10px;
	}
	.liste {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.liste li {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 6px 16px;
		padding: 10px 0;
		border-bottom: 1px solid var(--filet-doux);
	}
	.outils {
		display: flex;
		gap: 12px;
	}
	.lien {
		font: inherit;
		background: none;
		border: 0;
		padding: 0;
		color: var(--bleu-texte);
		text-decoration: underline;
		cursor: pointer;
		min-height: 32px;
	}
	@media (max-width: 700px) {
		.page {
			padding: 24px 16px;
		}
	}
</style>
