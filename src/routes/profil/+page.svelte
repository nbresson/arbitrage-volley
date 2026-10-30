<script lang="ts">
	// Mon profil : ce que la plateforme sait du compte. Les informations de formation sont réglées par le formateur.
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { referentiel } from '#lib/data/seances.ts';
	import { session } from '#lib/session.svelte.ts';
	import { supabase } from '#lib/supabase.ts';

	let email = $state('');
	let niveau = $state('');

	$effect(() => {
		supabase.auth.getUser().then(({ data }) => (email = data.user?.email ?? ''));
		referentiel()
			.then((r) => (niveau = r.niveaux.find((n) => n.id === session.profil?.niveau_id)?.libelle ?? ''))
			.catch(() => {});
	});

	const p = $derived(session.profil);
</script>

<svelte:head><title>{'Mon profil'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Mon profil">
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<main class="page">
	<h1 class="titre-page"><span class="surtitre">Mon compte</span>Mon profil</h1>
	{#if p}
		<section class="carte">
			<dl>
				<dt>Nom</dt><dd>{p.prenom} {p.nom}</dd>
				<dt>Adresse e-mail</dt><dd>{email || '…'}</dd>
				<dt>Rôle</dt><dd>{p.role === 'formateur' ? 'Formateur' : 'Stagiaire'}</dd>
				<dt>Formation</dt><dd>{p.profil_formation === 'arbitre' ? 'Arbitre' : 'Marqueur'}</dd>
				<dt>Niveau</dt><dd>{niveau || '—'}</dd>
			</dl>
			<p class="aide">Pour corriger votre nom, votre formation ou votre niveau, adressez-vous à votre formateur.</p>
		</section>
		<section class="carte">
			<h2>Sécurité et confort</h2>
			<div class="liens">
				<a class="btn2" href="/mot-de-passe">Changer mon mot de passe</a>
				<a class="btn2" href="/preferences">Préférences</a>
				<a class="btn2" href="/aide">Aide et raccourcis</a>
			</div>
		</section>
	{/if}
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
	.carte {
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
	}
	dl {
		margin: 0;
		display: grid;
		grid-template-columns: 150px minmax(0, 1fr);
		gap: 10px 16px;
	}
	dt {
		color: var(--doux);
	}
	dd {
		margin: 0;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.aide {
		margin: 0;
		color: var(--doux);
	}
	.liens {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
</style>
