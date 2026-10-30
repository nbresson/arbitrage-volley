<script lang="ts">
	import Icone from '#lib/components/Icone.svelte';
	import { iconeTheme } from '#lib/domain/icone-theme.ts';
	import '#lib/components/formulaire.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { borner, EXAMEN_PAR_THEME, lireParametres, parametresParDefaut, type ParametresSeance } from '#lib/data/parametres-seance.ts';
	import { creerSeance, referentiel, urlSeance, type Option } from '#lib/data/seances.ts';
	import { session } from '#lib/session.svelte.ts';

	const AUCUNE = 'Aucune question ne correspond à ces critères.';

	let p = $state<ParametresSeance>(lireParametres(page.url, session.profil!));
	let themes = $state<Option[]>([]);
	let niveaux = $state<Option[]>([]);
	let erreur = $state('');
	let envoi = $state(false);
	// Examen blanc : complet (plusieurs thèmes possibles) ou par thème (dix questions chronométrées sur un seul thème).
	let format = $state<'complet' | 'theme'>(page.url.searchParams.get('format') === 'theme' ? 'theme' : 'complet');
	const parTheme = $derived(p.type === 'examen_entrainement' && format === 'theme');
	// Arrivée depuis un thème de l'accueil : un résumé suffit, les réglages détaillés s'ouvrent sur demande.
	let detail = $state(!page.url.searchParams.has('theme'));
	const nomsThemes = $derived(themes.filter((t) => p.themeIds.includes(t.id)).map((t) => t.libelle));
	const nomNiveau = $derived(niveaux.find((n) => n.id === p.niveauId)?.libelle ?? 'tous les niveaux');
	const nomRole = $derived(p.role === 'arbitre' ? 'arbitre' : p.role === 'marqueur' ? 'marqueur' : 'arbitre et marqueur');

	$effect(() => {
		referentiel()
			.then((r) => ((themes = r.themes), (niveaux = r.niveaux)))
			.catch(() => (erreur = 'Les thèmes n’ont pas pu être chargés. Vérifiez votre connexion puis rechargez la page.'));
	});

	function changerMode(type: ParametresSeance['type']) {
		const d = type === 'examen_entrainement' && format === 'theme' ? EXAMEN_PAR_THEME : parametresParDefaut(session.profil!, type);
		p = { ...p, type, nb: d.nb, dureeMinutes: d.dureeMinutes };
	}

	function changerFormat(f: 'complet' | 'theme') {
		format = f;
		const d = f === 'theme' ? EXAMEN_PAR_THEME : parametresParDefaut(session.profil!, 'examen_entrainement');
		p = { ...p, nb: d.nb, dureeMinutes: d.dureeMinutes, themeIds: f === 'theme' ? p.themeIds.slice(0, 1) : p.themeIds };
	}

	function basculerTheme(id: string) {
		p.themeIds = p.themeIds.includes(id) ? p.themeIds.filter((t) => t !== id) : [...p.themeIds, id];
	}

	async function lancer(e?: SubmitEvent) {
		e?.preventDefault();
		erreur = '';
		if (parTheme && p.themeIds.length !== 1) {
			erreur = 'Choisissez le thème de l’examen.';
			detail = true;
			return;
		}
		envoi = true;
		try {
			const id = await creerSeance({ ...p, nb: borner(p.nb, 5, 50) });
			goto(urlSeance(p.type, id));
		} catch (err) {
			erreur = err instanceof Error && err.message === AUCUNE ? AUCUNE : 'La séance n’a pas pu être créée. Vérifiez votre connexion puis réessayez.';
		} finally {
			envoi = false;
		}
	}

	function elargir() {
		p.niveauId = null;
		lancer();
	}
</script>

<svelte:head><title>{'Nouvelle séance'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Nouvelle séance">
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<main class="page">
	<h1 class="titre-page"><span class="surtitre">S’entraîner</span>Nouvelle séance</h1>
	<form class="carte" onsubmit={lancer} novalidate>
		<fieldset>
			<legend>Mode</legend>
			<label class="choix"><input type="radio" name="mode" checked={p.type === 'pedagogique'} onchange={() => changerMode('pedagogique')} />
				<span><b>Mode pédagogique</b> — correction, explication et règle après chaque réponse.</span></label>
			<label class="choix"><input type="radio" name="mode" checked={p.type === 'examen_entrainement'} onchange={() => changerMode('examen_entrainement')} />
				<span><b>Examen blanc</b> — conditions réelles, chronométré, score à la fin sans correction.</span></label>
		</fieldset>

		{#if p.type === 'examen_entrainement'}
			<fieldset>
				<legend>Format de l’examen</legend>
				<label class="choix"><input type="radio" name="format" checked={format === 'complet'} onchange={() => changerFormat('complet')} />
					<span><b>Examen complet</b> — {parametresParDefaut(session.profil!, 'examen_entrainement').nb} questions en {parametresParDefaut(session.profil!, 'examen_entrainement').dureeMinutes} minutes, comme le jour de l’examen.</span></label>
				<label class="choix"><input type="radio" name="format" checked={format === 'theme'} onchange={() => changerFormat('theme')} />
					<span><b>Examen par thème</b> — {EXAMEN_PAR_THEME.nb} questions en {EXAMEN_PAR_THEME.dureeMinutes} minutes sur un seul thème.</span></label>
			</fieldset>
		{/if}

		{#if p.regleId}
			<p class="message-info">Séance limitée aux questions liées à la règle choisie. <button type="button" class="lien" onclick={() => (p.regleId = null)}>Retirer ce filtre</button></p>
		{/if}

		{#if !detail}
			<div class="resume">
				<p><b>{nomsThemes.join(', ') || 'Tous les thèmes'}</b> · {nomNiveau} · {nomRole} · jusqu’à {p.nb} questions{p.type === 'examen_entrainement' ? ` · ${p.dureeMinutes} min` : ''}</p>
				<button type="button" class="btn2" onclick={() => (detail = true)}>Modifier les réglages</button>
			</div>
		{:else}
		<fieldset>
			{#if parTheme}
				<legend>Thème de l’examen</legend>
			{:else}
				<legend>Thèmes <span class="aide">(aucun coché = tous les thèmes)</span></legend>
			{/if}
			<div class="themes">
				{#each themes as t (t.id)}
					{#if parTheme}
						<label class="case"><input type="radio" name="theme-examen" checked={p.themeIds[0] === t.id} onchange={() => (p.themeIds = [t.id])} /> <Icone nom={iconeTheme(t.libelle)} taille={18} />{t.libelle}</label>
					{:else}
						<label class="case"><input type="checkbox" checked={p.themeIds.includes(t.id)} onchange={() => basculerTheme(t.id)} /> <Icone nom={iconeTheme(t.libelle)} taille={18} />{t.libelle}</label>
					{/if}
				{/each}
			</div>
		</fieldset>

		<div class="ligne">
			<label class="champ">
				Niveau
				<select bind:value={p.niveauId}>
					<option value={null}>Tous les niveaux</option>
					{#each niveaux as n (n.id)}<option value={n.id}>{n.libelle}</option>{/each}
				</select>
			</label>
			<label class="champ">
				Rôle
				<select bind:value={p.role}>
					<option value="arbitre">Arbitre</option>
					<option value="marqueur">Marqueur</option>
					<option value={null}>Les deux</option>
				</select>
			</label>
			<label class="champ">
				Nombre de questions (au plus)
				<input type="number" min="5" max="50" bind:value={p.nb} aria-describedby="aide-nb" />
				<span class="aide" id="aide-nb">Si moins de questions correspondent, la séance les prend toutes.</span>
			</label>
			{#if p.type === 'examen_entrainement'}
				<label class="champ">
					Durée (minutes)
					<input type="number" min="5" max="120" bind:value={p.dureeMinutes} />
				</label>
			{/if}
		</div>
		{/if}

		{#if erreur}
			<div class="message-erreur" role="alert">
				{erreur}
				{#if erreur === AUCUNE && p.niveauId}<button type="button" class="btn2" onclick={elargir}>Élargir aux autres niveaux</button>{/if}
			</div>
		{/if}
		<button class="btn" type="submit" disabled={envoi}>{envoi ? 'Préparation…' : 'Commencer la séance'}</button>
	</form>
</main>

<style>
	.resume {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 20px;
		padding: 14px 16px;
		border: 1px solid var(--filet);
		border-radius: var(--r);
		background: var(--ligne-survol);
	}
	.resume p {
		margin: 0;
	}
	.page {
		max-width: 880px;
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
		padding: 28px;
		display: flex;
		flex-direction: column;
		gap: 22px;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	legend {
		font-weight: 700;
		margin-bottom: 10px;
	}
	.aide {
		font-weight: 400;
		color: var(--doux);
		font-size: 14px;
	}
	.choix {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		line-height: 1.5;
	}
	.choix input,
	.case input {
		width: 18px;
		height: 18px;
		margin-top: 3px;
		accent-color: var(--tableau);
	}
	.themes {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 8px 16px;
	}
	.case {
		display: flex;
		gap: 8px;
		align-items: flex-start;
	}
	.ligne {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
	}
	.ligne .champ {
		flex: 1 1 180px;
	}
	.btn {
		align-self: flex-start;
	}
	.message-erreur {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
	}
	.lien {
		font: inherit;
		background: none;
		border: 0;
		color: var(--bleu-texte);
		text-decoration: underline;
		cursor: pointer;
		padding: 0;
	}
</style>
