<script lang="ts">
	import MessageErreur from '#lib/components/MessageErreur.svelte';
	import EtatVide from '#lib/components/EtatVide.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	// Consignes CFA (spec § 9.3, écran 12) : les formateurs les saisissent une par une, édition par édition.
	// Une seule édition CFA est active ; activer la suivante marque « à relire » les questions liées à l'ancienne.
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import DialogueConfirmation from '#lib/components/DialogueConfirmation.svelte';
	import NavFormateur from '#lib/components/NavFormateur.svelte';
	import {
		activerEdition,
		consignes as lireConsignes,
		creerEditionCfa,
		editionsCfa,
		enregistrerConsigne,
		questionsLieesAuCfaActif,
		supprimerConsigne,
		type Consigne,
		type EditionCfa
	} from '#lib/data/consignes.ts';
	import { validerConsigne, type FormulaireConsigne } from '#lib/formateur/validation-consigne.ts';
	import { decouperConsignes, type ConsigneDecoupee } from '#lib/formateur/decoupage-cfa.ts';

	let editions = $state<EditionCfa[]>([]);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	let choisie = $state<string | null>(null);
	let liste = $state<Consigne[]>([]);
	let nouvelleEdition = $state('');
	let erreurEdition = $state('');
	let message = $state('');
	const vide = (): FormulaireConsigne => ({ reference: '', titre: '', texte: '' });
	let f = $state(vide());
	let enEdition = $state<string | null>(null);
	let erreurs = $state<Record<string, string>>({});
	let erreurConsigne = $state('');
	let aActiver = $state<{ edition: EditionCfa; aRelire: number } | null>(null);
	let aSupprimer = $state<Consigne | null>(null);
	let erreurDialogue = $state('');

	async function charger() {
		try {
			editions = await editionsCfa();
			if (!choisie || !editions.some((e) => e.id === choisie)) choisie = editions.find((e) => e.active)?.id ?? editions[0]?.id ?? null;
			liste = choisie ? await lireConsignes(choisie) : [];
			etat = 'pret';
		} catch {
			etat = 'erreur';
		}
	}

	$effect(() => {
		charger();
	});

	async function choisir(id: string) {
		choisie = id;
		annulerEdition();
		message = '';
		liste = await lireConsignes(id).catch(() => []);
	}

	async function creerEdition(e: SubmitEvent) {
		e.preventDefault();
		erreurEdition = '';
		if (!nouvelleEdition.trim()) return void (erreurEdition = 'Donnez un nom à l’édition, par exemple « Consignes CFA 2025-2026 ».');
		try {
			choisie = await creerEditionCfa(nouvelleEdition);
			nouvelleEdition = '';
			await charger();
		} catch (err) {
			const m = (err as Error).message;
			erreurEdition = /duplicate|unique/i.test(m) ? 'Une édition porte déjà ce nom.' : 'L’édition n’a pas pu être créée. Réessayez.';
		}
	}

	async function preparerActivation(ed: EditionCfa) {
		erreurDialogue = '';
		const aRelire = await questionsLieesAuCfaActif().catch(() => 0);
		aActiver = { edition: ed, aRelire };
	}

	async function activer() {
		if (!aActiver) return;
		try {
			const n = await activerEdition(aActiver.edition.id);
			message = `« ${aActiver.edition.libelle} » est l’édition active.${n ? ` ${n} question${n > 1 ? 's' : ''} passe${n > 1 ? 'nt' : ''} « à relire ».` : ''}`;
			aActiver = null;
			await charger();
		} catch (err) {
			erreurDialogue = (err as Error).message;
		}
	}

	function modifier(c: Consigne) {
		enEdition = c.id;
		f = { reference: c.reference, titre: c.titre ?? '', texte: c.texte };
		erreurs = {};
		erreurConsigne = '';
	}

	function annulerEdition() {
		enEdition = null;
		f = vide();
		erreurs = {};
		erreurConsigne = '';
	}

	async function enregistrer(e: SubmitEvent) {
		e.preventDefault();
		if (!choisie) return;
		message = '';
		erreurConsigne = '';
		erreurs = validerConsigne(f, liste.filter((c) => c.id !== enEdition).map((c) => c.reference));
		if (Object.keys(erreurs).length) return;
		try {
			await enregistrerConsigne(choisie, f, enEdition, liste.length + 1);
			message = `Consigne ${f.reference.trim()} enregistrée.`;
			annulerEdition();
			await charger();
		} catch {
			erreurConsigne = 'La consigne n’a pas pu être enregistrée. Réessayez.';
		}
	}

	// Import assisté : texte collé (ou fichier texte), découpé en consignes, relu, puis ajouté.
	let texteImport = $state('');
	let prefixe = $state('CFA ');
	let decoupees = $state<(ConsigneDecoupee & { garder: boolean; erreur?: string })[]>([]);
	let messageImport = $state('');
	let importEnCours = $state(false);

	async function lireFichier(e: Event) {
		const fichier = (e.currentTarget as HTMLInputElement).files?.[0];
		if (fichier) texteImport = await fichier.text();
	}

	function decouper() {
		messageImport = '';
		const existantes = liste.map((c) => c.reference);
		decoupees = decouperConsignes(texteImport).map((c) => {
			const ref = `${prefixe}${c.reference}`.trim();
			const erreur = existantes.includes(ref) ? 'Référence déjà présente dans cette édition.' : !c.texte.trim() ? 'Texte vide.' : undefined;
			return { ...c, reference: ref, garder: !erreur, erreur };
		});
		if (!decoupees.length) messageImport = 'Aucun numéro trouvé en début de ligne (1., 1.2, Consigne 3…). Vérifiez le texte collé.';
	}

	async function importer() {
		if (!choisie) return;
		importEnCours = true;
		let n = 0;
		for (const c of decoupees.filter((x) => x.garder)) {
			try {
				await enregistrerConsigne(choisie, { reference: c.reference, titre: c.titre, texte: c.texte }, null, liste.length + n + 1);
				n++;
			} catch {
				c.erreur = 'Non enregistrée : réessayez.';
			}
		}
		importEnCours = false;
		decoupees = decoupees.filter((x) => x.erreur && x.garder);
		messageImport = `${n} consigne${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}.`;
		if (!decoupees.length) texteImport = '';
		await charger();
	}

	async function supprimer() {
		if (!aSupprimer) return;
		try {
			await supprimerConsigne(aSupprimer.id);
			message = `Consigne ${aSupprimer.reference} supprimée.`;
			aSupprimer = null;
			await charger();
		} catch (err) {
			erreurDialogue = (err as Error).message;
		}
	}

	const edition = $derived(editions.find((e) => e.id === choisie) ?? null);
</script>

<svelte:head><title>{'Consignes CFA'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Espace formateur">
	{#snippet navigation()}<NavFormateur />{/snippet}
</Bandeau>

<main class="page">
	<div class="tete">
		<h1 class="titre-page"><span class="surtitre">Espace formateur</span>Consignes CFA</h1>
		<a href="/formateur/glossaire">Glossaire et figures</a>
		<a href="/regles">Consulter toutes les règles</a>
	</div>
	<p class="aide">Les règles FIVB et le Casebook sont importés par script. Les consignes de la Commission Française d’Arbitrage se saisissent ici, puis se lient aux questions comme les autres règles.</p>

	{#if etat === 'chargement'}
		<Chargement />
	{:else if etat === 'erreur'}
		<MessageErreur texte="Les consignes n’ont pas pu être chargées." />
	{:else}
		{#if message}<p class="message-info" role="status">{message}</p>{/if}
		<div class="colonnes">
			<section class="carte editions">
				<h2>Éditions</h2>
				{#if editions.length}
					<ul>
						{#each editions as ed (ed.id)}
							<li class:sel={ed.id === choisie}>
								<button class="lien-ed" aria-current={ed.id === choisie ? 'true' : undefined} onclick={() => choisir(ed.id)}>{ed.libelle}</button>
								<span class="sous">{ed.consignes} consigne{ed.consignes > 1 ? 's' : ''} · {ed.active ? 'active' : 'inactive'}</span>
								{#if !ed.active}<button class="lien" onclick={() => preparerActivation(ed)}>Activer…</button>{/if}
							</li>
						{/each}
					</ul>
				{/if}
				<form onsubmit={creerEdition} novalidate>
					<label class="champ">Nouvelle édition<input bind:value={nouvelleEdition} placeholder="Consignes CFA 2025-2026" autocomplete="off" /></label>
					{#if erreurEdition}<span class="erreur">{erreurEdition}</span>{/if}
					<button class="btn2" type="submit">Créer l’édition</button>
				</form>
			</section>

			<section class="contenu">
				{#if !edition}
					<EtatVide titre="Aucune consigne CFA saisie" texte="Le document de la CFA n’a pas encore été fourni : vous pouvez saisir les consignes une par une. Commencez par créer une édition." />
				{:else}
					<h2>{edition.libelle} <span class="sous">{edition.active ? 'Édition active : visible des stagiaires' : 'Édition inactive : invisible des stagiaires tant qu’elle n’est pas activée'}</span></h2>
					{#if liste.length}
						<ul class="consignes">
							{#each liste as c (c.id)}
								<li>
									<span class="ref plaque">{c.reference}</span>
									<span class="corps">{c.titre ?? c.texte.slice(0, 120)}{#if c.citee}<span class="sous">Citée par au moins une question</span>{/if}</span>
									<span class="outils">
										<button class="lien" onclick={() => modifier(c)}>Modifier</button>
										<button class="lien" onclick={() => ((aSupprimer = c), (erreurDialogue = ''))}>Supprimer…</button>
									</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="aide">Aucune consigne dans cette édition. Saisissez la première avec le formulaire.</p>
					{/if}

					<form class="carte" onsubmit={enregistrer} novalidate>
						<h3>{enEdition ? `Modifier la consigne ${f.reference}` : 'Ajouter une consigne'}</h3>
						<label class="champ">Référence<input bind:value={f.reference} placeholder="CFA 3.2" autocomplete="off" />{#if erreurs.reference}<span class="erreur">{erreurs.reference}</span>{/if}</label>
						<label class="champ">Titre (facultatif)<input bind:value={f.titre} autocomplete="off" /></label>
						<label class="champ">Texte<textarea rows="6" bind:value={f.texte}></textarea>{#if erreurs.texte}<span class="erreur">{erreurs.texte}</span>{/if}</label>
						{#if erreurConsigne}<p class="message-erreur" role="alert">{erreurConsigne}</p>{/if}
						<div class="actions">
							<button class="btn" type="submit">Enregistrer</button>
							{#if enEdition}<button class="lien" type="button" onclick={annulerEdition}>Annuler</button>{/if}
						</div>
					</form>

					<details class="carte import">
						<summary>Importer un document de consignes</summary>
						<p class="aide">Copiez le texte du document (PDF ou Word) et collez-le ci-dessous, ou choisissez un fichier texte. Chaque numéro en début de ligne (« 1. », « 1.2 », « Consigne 3 ») commence une consigne. Vous relisez le découpage avant l’ajout.</p>
						<label class="champ">Texte du document<textarea rows="8" bind:value={texteImport}></textarea></label>
						<div class="ligne-import">
							<label class="champ">Ou un fichier texte<input type="file" accept=".txt,.md,text/plain" onchange={lireFichier} /></label>
							<label class="champ">Préfixe des références<input bind:value={prefixe} autocomplete="off" /></label>
						</div>
						<button type="button" class="btn2" onclick={decouper} disabled={!texteImport.trim()}>Découper en consignes</button>
						{#if decoupees.length}
							<ul class="decoupees">
								{#each decoupees as c, i (i)}
									<li>
										<label class="case"><input type="checkbox" bind:checked={c.garder} disabled={!!c.erreur && !c.garder} /> <span class="ref plaque">{c.reference}</span> <b>{c.titre}</b></label>
										<p>{c.texte.length > 220 ? `${c.texte.slice(0, 220)}…` : c.texte}</p>
										{#if c.erreur}<p class="erreur">{c.erreur}</p>{/if}
									</li>
								{/each}
							</ul>
							<button type="button" class="btn" onclick={importer} disabled={importEnCours || !decoupees.some((x) => x.garder)}>
								{importEnCours ? 'Ajout en cours…' : `Ajouter ${decoupees.filter((x) => x.garder).length} consigne(s) à « ${edition.libelle} »`}
							</button>
						{/if}
						{#if messageImport}<p class="message-info" role="status">{messageImport}</p>{/if}
					</details>
				{/if}
			</section>
		</div>
	{/if}
</main>

<DialogueConfirmation
	ouvert={!!aActiver}
	titre="Activer « {aActiver?.edition.libelle ?? ''} » ?"
	texte="Elle remplacera l’édition CFA active pour les stagiaires. {aActiver?.aRelire
		? `${aActiver.aRelire} question${aActiver.aRelire > 1 ? 's' : ''} liée${aActiver.aRelire > 1 ? 's' : ''} à l’ancienne édition passer${aActiver.aRelire > 1 ? 'ont' : 'a'} « à relire » ; elle${aActiver.aRelire > 1 ? 's' : ''} reste${aActiver.aRelire > 1 ? 'nt' : ''} utilisable${aActiver.aRelire > 1 ? 's' : ''}.`
		: 'Aucune question validée n’est liée à l’édition actuelle.'}"
	libelleAnnuler="Annuler"
	libelleConfirmer="Activer"
	erreur={erreurDialogue}
	onannuler={() => (aActiver = null)}
	onconfirmer={activer}
/>
<DialogueConfirmation
	ouvert={!!aSupprimer}
	titre="Supprimer la consigne {aSupprimer?.reference ?? ''} ?"
	texte="Elle disparaîtra de la consultation des règles. Une consigne citée par une question validée ne peut pas être supprimée : retirez-la d’abord de la question."
	libelleAnnuler="Garder la consigne"
	libelleConfirmer="Supprimer"
	erreur={erreurDialogue}
	onannuler={() => ((aSupprimer = null), (erreurDialogue = ''))}
	onconfirmer={supprimer}
/>

<style>
	.import summary {
		cursor: pointer;
		font-weight: 700;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.import[open] {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.ligne-import {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	.ligne-import .champ {
		flex: 1 1 220px;
	}
	.decoupees {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 420px;
		overflow: auto;
		border: 1px solid var(--filet-doux);
		border-radius: var(--r);
	}
	.decoupees li {
		padding: 10px 12px;
		border-bottom: 1px solid var(--filet-doux);
	}
	.decoupees p {
		margin: 4px 0 0;
		font-size: 14px;
		color: var(--doux);
	}
	.page {
		padding: 28px 40px 48px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.tete {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
	}
	h2 {
		margin: 0;
		font-size: 20px;
	}
	h3 {
		margin: 0;
		font-size: 17px;
	}
	.aide {
		margin: 0;
		color: var(--doux);
		max-width: 50em;
		line-height: 1.6;
	}
	.sous {
		display: block;
		font-size: 13px;
		font-weight: 400;
		color: var(--doux);
	}
	.colonnes {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
		align-items: flex-start;
	}
	.editions {
		flex: 1 1 280px;
		max-width: 360px;
	}
	.contenu {
		flex: 999 1 520px;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.carte {
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.editions ul,
	.consignes {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.editions li {
		padding: 10px 0;
		border-bottom: 1px solid var(--filet-doux);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.editions li.sel .lien-ed {
		text-decoration-color: var(--encre);
	}
	.lien-ed {
		font: inherit;
		font-weight: 600;
		color: var(--encre);
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		text-align: left;
		text-decoration: underline;
		text-decoration-color: var(--filet);
		text-underline-offset: 4px;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
	}
	.editions form {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.consignes {
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
	}
	.consignes li {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 16px;
		align-items: baseline;
		padding: 12px 16px;
		border-bottom: 1px solid var(--filet-doux);
	}
	.consignes li:last-child {
		border-bottom: 0;
	}
	.ref {
		font-size: 18px;
		min-width: 5em;
	}
	.corps {
		flex: 1 1 280px;
		min-width: 0;
	}
	.outils,
	.actions {
		display: flex;
		gap: 16px;
		align-items: center;
	}
	.lien {
		font: inherit;
		background: none;
		border: 0;
		padding: 0;
		color: var(--bleu-texte);
		text-decoration: underline;
		cursor: pointer;
		align-self: flex-start;
	}
	.erreur {
		color: var(--rouge-texte);
		font-weight: 600;
		font-size: 14px;
	}
	.btn,
	.btn2 {
		align-self: flex-start;
	}
	@media (max-width: 700px) {
		.page {
			padding: 20px 16px;
		}
		.editions {
			max-width: none;
		}
	}
</style>
