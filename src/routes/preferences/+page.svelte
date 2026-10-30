<script lang="ts">
	// Préférences personnelles : affichage (thème, taille du texte, animations, contraste) et entraînement.
	// Gardées dans ce navigateur, appliquées tout de suite.
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { appliquerAffichage, enregistrerPreferences, lirePreferences, type Preferences } from '#lib/preferences.ts';

	let p = $state<Preferences>(lirePreferences());
	let message = $state('');

	function changer<K extends keyof Preferences>(cle: K, valeur: Preferences[K]) {
		p = enregistrerPreferences({ [cle]: valeur } as Partial<Preferences>);
		appliquerAffichage(p);
		message = 'Préférence enregistrée sur cet appareil.';
	}
</script>

<svelte:head><title>{'Préférences'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Préférences">
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<main class="page">
	<h1 class="titre-page"><span class="surtitre">Mon compte</span>Préférences</h1>
	<p class="aide">Ces réglages valent pour cet appareil et ce navigateur. Ils s’appliquent tout de suite.</p>
	<p class="vh" role="status">{message}</p>

	<section class="carte">
		<h2>Affichage</h2>
		<fieldset>
			<legend>Thème</legend>
			<div class="choix">
				{#each [['auto', 'Automatique', 'suit le réglage de l’appareil'], ['clair', 'Clair', ''], ['sombre', 'Sombre', '']] as [v, l, d] (v)}
					<label class="option"><input type="radio" name="theme" checked={p.theme === v} onchange={() => changer('theme', v as Preferences['theme'])} /><span><b>{l}</b>{#if d}<span class="detail"> — {d}</span>{/if}</span></label>
				{/each}
			</div>
		</fieldset>
		<fieldset>
			<legend>Taille du texte</legend>
			<div class="tailles">
				{#each [['normale', 'A', 'Normale'], ['grande', 'A+', 'Grande'], ['tres-grande', 'A++', 'Très grande']] as [v, l, nom], i (v)}
					<label class="taille" class:choisie={p.taille === v}>
						<input type="radio" name="taille" checked={p.taille === v} onchange={() => changer('taille', v as Preferences['taille'])} />
						<span class="lettre" style:font-size="{18 + i * 5}px" aria-hidden="true">{l}</span><span class="vh">{nom}</span>
					</label>
				{/each}
			</div>
		</fieldset>
		<label class="option"><input type="checkbox" checked={p.animations === 'reduites'} onchange={(e) => changer('animations', e.currentTarget.checked ? 'reduites' : 'systeme')} />
			<span><b>Réduire les animations</b><span class="detail"> — les volets changent sans tourner, les pages sans fondu.</span></span></label>
		<label class="option"><input type="checkbox" checked={p.contraste === 'eleve'} onchange={(e) => changer('contraste', e.currentTarget.checked ? 'eleve' : 'normal')} />
			<span><b>Contraste élevé</b><span class="detail"> — texte plus foncé, bordures plus marquées, sans textures.</span></span></label>
	</section>

	<section class="carte">
		<h2>Entraînement</h2>
		<label class="champ">Objectif de séances par semaine
			<select value={String(p.objectifSemaine)} onchange={(e) => changer('objectifSemaine', Number(e.currentTarget.value))}>
				{#each [1, 2, 3, 5, 7] as n (n)}<option value={String(n)}>{n} séance{n > 1 ? 's' : ''} par semaine</option>{/each}
			</select>
		</label>
		<label class="champ">Ordre des thèmes sur l’accueil
			<select value={p.triThemes} onchange={(e) => changer('triThemes', e.currentTarget.value as Preferences['triThemes'])}>
				<option value="reglement">Ordre du règlement</option>
				<option value="faibles">Les plus faibles d’abord</option>
				<option value="alpha">Ordre alphabétique</option>
			</select>
		</label>
		<label class="option"><input type="checkbox" checked={p.minuteurQuestion} onchange={(e) => changer('minuteurQuestion', e.currentTarget.checked)} />
			<span><b>Minuteur de 30 secondes</b><span class="detail"> — en séance pédagogique, pour apprendre à décider vite.</span></span></label>
	</section>

	<p><a href="/profil">Mon profil</a> · <a href="/aide">Aide et raccourcis</a></p>
</main>

<style>
	.page {
		max-width: 760px;
		margin: 0 auto;
		padding: 32px 20px 48px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.aide,
	.detail {
		color: var(--doux);
	}
	.aide {
		margin: 0;
	}
	.carte {
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	h2 {
		margin: 0;
		font-size: 20px;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
	}
	legend {
		font-weight: 700;
		margin-bottom: 10px;
	}
	.choix {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.option {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		line-height: 1.5;
		min-height: 44px;
	}
	.option input {
		width: 18px;
		height: 18px;
		margin-top: 3px;
		accent-color: var(--trait);
	}
	.tailles {
		display: flex;
		gap: 10px;
	}
	.taille {
		position: relative;
		width: 64px;
		height: 56px;
		display: grid;
		place-items: center;
		border: 1.5px solid var(--filet);
		border-radius: var(--r);
		cursor: pointer;
		background: var(--papier);
	}
	.taille input {
		position: absolute;
		opacity: 0;
		inset: 0;
		margin: 0;
		cursor: pointer;
	}
	.taille.choisie {
		border: 2px solid var(--trait);
		background: var(--ligne-survol);
	}
	.taille:has(input:focus-visible) {
		outline: 2px solid var(--bleu);
		outline-offset: 2px;
	}
	.lettre {
		font-family: var(--police-chiffres);
		font-weight: 800;
	}
</style>
