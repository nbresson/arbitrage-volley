<script lang="ts">
	import '#lib/components/formulaire.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { borner, lireParametres, parametresParDefaut, type ParametresSeance } from '#lib/data/parametres-seance.ts';
	import { creerSeance, referentiel, urlSeance, type Option } from '#lib/data/seances.ts';
	import { session } from '#lib/session.svelte.ts';

	const AUCUNE = 'Aucune question ne correspond à ces critères.';

	let p = $state<ParametresSeance>(lireParametres(page.url, session.profil!));
	let themes = $state<Option[]>([]);
	let niveaux = $state<Option[]>([]);
	let erreur = $state('');
	let envoi = $state(false);

	$effect(() => {
		referentiel()
			.then((r) => ((themes = r.themes), (niveaux = r.niveaux)))
			.catch(() => (erreur = 'Les thèmes n’ont pas pu être chargés. Vérifiez votre connexion puis rechargez la page.'));
	});

	function changerMode(type: ParametresSeance['type']) {
		const d = parametresParDefaut(session.profil!, type);
		p = { ...p, type, nb: d.nb, dureeMinutes: d.dureeMinutes };
	}

	function basculerTheme(id: string) {
		p.themeIds = p.themeIds.includes(id) ? p.themeIds.filter((t) => t !== id) : [...p.themeIds, id];
	}

	async function lancer(e?: SubmitEvent) {
		e?.preventDefault();
		erreur = '';
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

<Bandeau titre="Arbitrage volley" sousTitre="Nouvelle séance">
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<main class="page">
	<h1>Nouvelle séance</h1>
	<form class="carte" onsubmit={lancer} novalidate>
		<fieldset>
			<legend>Mode</legend>
			<label class="choix"><input type="radio" name="mode" checked={p.type === 'pedagogique'} onchange={() => changerMode('pedagogique')} />
				<span><b>Mode pédagogique</b> — correction, explication et règle après chaque réponse.</span></label>
			<label class="choix"><input type="radio" name="mode" checked={p.type === 'examen_entrainement'} onchange={() => changerMode('examen_entrainement')} />
				<span><b>Examen d’entraînement</b> — conditions réelles, chronométré, score à la fin sans correction.</span></label>
		</fieldset>

		{#if p.regleId}
			<p class="message-info">Séance limitée aux questions liées à la règle choisie. <button type="button" class="lien" onclick={() => (p.regleId = null)}>Retirer ce filtre</button></p>
		{/if}

		<fieldset>
			<legend>Thèmes <span class="aide">(aucun coché = tous les thèmes)</span></legend>
			<div class="themes">
				{#each themes as t (t.id)}
					<label class="case"><input type="checkbox" checked={p.themeIds.includes(t.id)} onchange={() => basculerTheme(t.id)} /> {t.libelle}</label>
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
				Nombre de questions
				<input type="number" min="5" max="50" bind:value={p.nb} />
			</label>
			{#if p.type === 'examen_entrainement'}
				<label class="champ">
					Durée (minutes)
					<input type="number" min="5" max="120" bind:value={p.dureeMinutes} />
				</label>
			{/if}
		</div>

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
	.page {
		max-width: 880px;
		margin: 0 auto;
		padding: 32px 20px 48px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	h1 {
		margin: 0;
		font-size: 27px;
		font-weight: 600;
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
