<script lang="ts">
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

<Bandeau titre="Arbitrage volley" sousTitre="Espace formateur">
	{#snippet navigation()}<NavFormateur />{/snippet}
</Bandeau>

<main class="page">
	<div class="tete">
		<h1>Consignes CFA</h1>
		<a href="/regles">Consulter toutes les règles</a>
	</div>
	<p class="aide">Les règles FIVB et le Casebook sont importés par script. Les consignes de la Commission Française d’Arbitrage se saisissent ici, puis se lient aux questions comme les autres règles.</p>

	{#if etat === 'chargement'}
		<p role="status">Chargement…</p>
	{:else if etat === 'erreur'}
		<p class="message-erreur" role="alert">Les consignes n’ont pas pu être chargées. Vérifiez votre connexion puis rechargez la page.</p>
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
					<div class="carte">
						<h2>Aucune consigne CFA saisie</h2>
						<p class="aide">Le document de la CFA n’a pas encore été fourni : vous pouvez saisir les consignes une par une. Commencez par créer une édition.</p>
					</div>
				{:else}
					<h2>{edition.libelle} <span class="sous">{edition.active ? 'Édition active : visible des stagiaires' : 'Édition inactive : invisible des stagiaires tant qu’elle n’est pas activée'}</span></h2>
					{#if liste.length}
						<ul class="consignes">
							{#each liste as c (c.id)}
								<li>
									<span class="ref">{c.reference}</span>
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
	h1 {
		margin: 0;
		font-size: 27px;
		font-weight: 600;
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
		font-family: var(--police-chiffres);
		font-weight: 800;
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
