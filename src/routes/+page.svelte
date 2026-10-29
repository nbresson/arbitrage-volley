<script lang="ts">
	import { pluriel } from '#lib/domain/texte.ts';
	import Chargement from '#lib/components/Chargement.svelte';
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import EtatVide from '#lib/components/EtatVide.svelte';
	import Filet from '#lib/components/Filet.svelte';
	import Icone from '#lib/components/Icone.svelte';
	import ProgressionVolets from '#lib/components/ProgressionVolets.svelte';
	import { iconeTheme } from '#lib/domain/icone-theme.ts';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { lignesThemes, totaux, type Avancement } from '#lib/data/avancement.ts';
	import { lireConsultations, slug } from '#lib/data/regles.ts';
	import { mesConvocations, type Convocation } from '#lib/data/examens-officiels.ts';
	import { avancement, referentiel, seanceAReprendre } from '#lib/data/seances.ts';
	import { dateHeure, etatConvocation } from '#lib/examen-officiel/convocation.ts';
	import { session } from '#lib/session.svelte.ts';

	let av = $state<Avancement[]>([]);
	let reprise = $state<Awaited<ReturnType<typeof seanceAReprendre>>>(null);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	let convocations = $state<Convocation[]>([]);
	let niveau = $state('');
	const consultees = lireConsultations();

	$effect(() => {
		Promise.all([avancement(), seanceAReprendre()])
			.then(([a, r]) => ((av = a), (reprise = r), (etat = 'pret')))
			.catch(() => (etat = 'erreur'));
		// En cas d'échec, le bloc reste à « Aucun examen officiel prévu » : l'accueil reste utilisable.
		referentiel()
			.then((r) => (niveau = r.niveaux.find((n) => n.id === session.profil?.niveau_id)?.libelle ?? ''))
			.catch(() => {});
		mesConvocations()
			.then((c) => (convocations = c))
			.catch(() => {});
	});

	const lignes = $derived(lignesThemes(av));
	const t = $derived(totaux(av));
	const role = $derived(session.profil?.profil_formation === 'marqueur' ? 'marqueur' : 'arbitre');
	const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
	const aujourdhui = jour.charAt(0).toUpperCase() + jour.slice(1);
</script>

<Bandeau
	titre="Arbitrage volley"
	sousTitre="Formation des arbitres · espace stagiaire"
	compteurs={[
		{ valeur: t.travaillees, chiffres: 3, libelle: 'Questions travaillées' },
		{ valeur: t.acquises, chiffres: 3, libelle: 'Acquises', couleur: 'bleu' },
		{ valeur: t.aRevoir, chiffres: 3, libelle: 'À revoir', couleur: 'rouge' }
	]}
	resumeTexte="{pluriel(t.travaillees, 'travaillée')} · {pluriel(t.acquises, 'acquise')} · {t.aRevoir} à revoir"
>
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<div class="jeu">
	<section class="principal">
		{#if etat === 'erreur'}
			<p class="message-erreur" role="alert">Votre avancement n’a pas pu être chargé. Vérifiez votre connexion puis rechargez la page.</p>
		{/if}

		<div class="accueil">
			<h1 class="titre-page"><span class="surtitre">{aujourdhui} · {role} stagiaire</span>Bonjour {session.profil?.prenom ?? ''}</h1>
			{#if niveau}
				<div class="niveau">
					<svg width="30" height="34" viewBox="0 0 34 38" aria-hidden="true"><path d="M17 2 31 7v11c0 9-6 15-14 18C9 33 3 27 3 18V7z" fill="var(--tableau)" /><path d="M11 18l4 4 8-8" fill="none" stroke="var(--papier)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
					<span><span class="petit">Niveau</span>{niveau}</span>
				</div>
			{/if}
		</div>

		<nav class="tuiles" aria-label="Commencer">
			{#if reprise}
				<a class="tuile sombre" href="/entrainement/{reprise.id}">
					<span class="pastille"><Icone nom="sifflet" taille={26} /></span>
					<span class="nom">Reprendre : {reprise.theme}</span>
					<span class="desc">Question {reprise.index} sur {reprise.total} · {pluriel(reprise.acquises, 'acquise')}, {reprise.aRevoir} à revoir</span>
					<span class="suite">Reprendre la séance <Icone nom="fleche" taille={18} /></span>
				</a>
			{:else}
				<a class="tuile sombre" href="/entrainement/nouvelle">
					<span class="pastille"><Icone nom="sifflet" taille={26} /></span>
					<span class="nom">Séance d’entraînement</span>
					<span class="desc">Choisissez des thèmes : chaque réponse est corrigée avec la règle qui la fonde.</span>
					<span class="suite">Commencer une séance <Icone nom="fleche" taille={18} /></span>
				</a>
			{/if}
			<a class="tuile" href="/entrainement/nouvelle?mode=examen_entrainement">
				<span class="pastille"><Icone nom="chrono" taille={26} /></span>
				<span class="nom">Examen blanc</span>
				<span class="desc">Questions chronométrées, correction à la fin, comme le jour de l’examen.</span>
				<span class="suite">Lancer un examen blanc <Icone nom="fleche" taille={18} /></span>
			</a>
			<a class="tuile papier-reglement" href="/regles">
				<span class="pastille"><Icone nom="regles" taille={26} /></span>
				<span class="nom">Règles officielles</span>
				<span class="desc">Le règlement FIVB, le Casebook et les consignes CFA, avec recherche.</span>
				<span class="suite">Consulter les règles <Icone nom="fleche" taille={18} /></span>
			</a>
		</nav>

		<h2>S’entraîner par thème</h2>
		{#if etat === 'chargement'}
			<Chargement />
		{:else if !lignes.length && etat === 'pret'}
			<EtatVide titre="Aucune question pour l’instant" texte="Vos formateurs sont en train de valider les questions. Revenez bientôt : elles apparaîtront ici, thème par thème." />
		{:else}
			<div class="defile">
				<table>
					<caption class="vh">Avancement par thème</caption>
					<thead>
						<tr><th scope="col">Thème</th><th scope="col">Acquises</th><th scope="col">À revoir</th><th scope="col">Avancement</th><th scope="col"><span class="vh">Action</span></th></tr>
					</thead>
					<tbody>
						{#each lignes as l (l.themeId)}
							<tr>
								<th scope="row"><span class="theme"><span class="picto"><Icone nom={iconeTheme(l.theme)} /></span><span>{l.theme}<span class="sous">{l.total} questions</span></span></span></th>
								{#if l.commence}
									<td class="chiffres bleu">{l.acquises}</td>
									<td class="chiffres rouge">{l.aRevoir}</td>
									<td><ProgressionVolets acquises={l.acquises} aRevoir={l.aRevoir} total={l.total} /></td>
									<td class="action"><a class="btn2" href="/entrainement/nouvelle?theme={l.themeId}" aria-label="S’entraîner : {l.theme}">S’entraîner</a></td>
								{:else}
									<td colspan="3" class="aide">Pas encore commencé</td>
									<td class="action"><a class="btn2" href="/entrainement/nouvelle?theme={l.themeId}" aria-label="Commencer : {l.theme}">Commencer</a></td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
	<Filet />
	<aside class="cote">
		{#each convocations as c (c.examen_id)}
			{@const e = etatConvocation(c)}
			<div class="convocation">
				<div class="bande-filet" aria-hidden="true"></div>
				<div class="tete">
					<h2>Examen officiel</h2>
					<span>{e === 'termine' ? 'Examen passé' : e === 'a_venir' ? 'Vous êtes inscrit · à venir' : 'Vous êtes inscrit'}</span>
				</div>
				<p class="titre-examen">{c.titre}</p>
				<div class="perforation" aria-hidden="true"></div>
				<dl>
					<dt><Icone nom="calendrier" taille={18} />Date</dt><dd>{dateHeure(c.date_heure)}</dd>
					{#if c.lieu}<dt><Icone nom="lieu" taille={18} />Lieu</dt><dd>{c.lieu}</dd>{/if}
					<dt><Icone nom="chrono" taille={18} />Durée</dt><dd>{c.duree_minutes} min · {c.nb_questions ? pluriel(c.nb_questions, 'question') : 'contenu en préparation'}</dd>
					{#if c.formateur}<dt><Icone nom="stagiaires" taille={18} />Formateur</dt><dd>{c.formateur}</dd>{/if}
				</dl>
				<div class="pied">
					{#if e === 'a_venir'}
						<a class="btn2" href="/entrainement/nouvelle?mode=examen_entrainement">S’entraîner en conditions d’examen</a>
					{:else if e === 'ouvert'}
						<a class="btn" href="/examen-officiel/{c.examen_id}">Commencer l’examen</a>
					{:else if e === 'en_cours'}
						<a class="btn" href="/examen-officiel/{c.examen_id}">Reprendre l’examen</a>
					{:else}
						<a class="btn2" href="/tentative/{c.tentative_id}/resultat">Voir mon résultat</a>
					{/if}
				</div>
			</div>
		{:else}
			<EtatVide titre="Aucun examen officiel prévu" texte="Votre formateur vous inscrira ; la convocation apparaîtra ici. En attendant, entraînez-vous dans les conditions de l’examen.">
				{#snippet action()}<a class="btn2" href="/entrainement/nouvelle?mode=examen_entrainement">Passer un examen d’entraînement</a>{/snippet}
			</EtatVide>
		{/each}
		<div>
			<h2>Règles consultées récemment</h2>
			{#if consultees.length}
				<ul class="consultees">
					{#each consultees as c (c.reference)}
						<li><a class="ref plaque" href="/regles/{slug(c.edition)}/{encodeURIComponent(c.reference)}">{c.reference}</a> <span class="aide">{c.resume}</span></li>
					{/each}
				</ul>
			{:else}
				<p class="aide">Les règles que vous ouvrez apparaîtront ici. <a href="/regles">Parcourir les règles</a></p>
			{/if}
		</div>
	</aside>
</div>

<style>
	.jeu {
		display: flex;
		flex-wrap: wrap;
		min-height: calc(100vh - 140px);
	}
	.principal {
		flex: 999 1 560px;
		min-width: 0;
		padding: 32px 44px 44px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.tuiles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
	}
	.tuile {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-height: 190px;
		padding: 20px 22px;
		background-color: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		color: var(--encre);
		text-decoration: none;
		transition: border-color var(--duree-micro) ease-out, transform var(--duree-micro) ease-out;
	}
	.tuile:hover {
		border-color: var(--tableau);
		transform: translateY(-2px);
	}
	.tuile .pastille {
		width: 46px;
		height: 46px;
		border-radius: var(--r);
		background: var(--tableau);
		color: var(--papier);
		display: grid;
		place-items: center;
	}
	.tuile .nom {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 26px;
		line-height: 1.05;
	}
	.tuile .desc {
		font-size: 15px;
		line-height: 1.45;
		color: var(--doux);
	}
	.tuile .suite {
		margin-top: auto;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 700;
	}
	.tuile.sombre {
		background-color: var(--tableau);
		border-color: var(--tableau);
		color: var(--papier);
	}
	.tuile.sombre:hover {
		background-color: var(--tableau-survol);
	}
	.tuile.sombre .pastille {
		background: var(--papier);
		color: var(--tableau);
	}
	.tuile.sombre .desc {
		color: var(--tableau-texte);
	}
	.theme {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.picto {
		flex: none;
		width: 36px;
		height: 36px;
		border-radius: var(--r);
		background: var(--sol);
		color: var(--tableau);
		display: grid;
		place-items: center;
	}
	@media (prefers-reduced-motion: reduce) {
		.tuile:hover {
			transform: none;
		}
	}
	.accueil {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
	}
	.niveau {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 8px 14px 8px 10px;
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		font-weight: 700;
	}
	.niveau > span {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
	}
	.petit {
		font-size: 13px;
		font-weight: 400;
		color: var(--doux);
	}
	h2 {
		margin: 0;
		font-size: 22px;
		font-weight: 700;
	}
	.aide {
		color: var(--doux);
		margin: 0;
	}
	.defile {
		overflow-x: auto;
	}
	table {
		width: 100%;
		min-width: 620px;
		border-collapse: collapse;
		background: var(--papier);
		border: 1px solid var(--filet);
	}
	th,
	td {
		padding: 12px;
		text-align: left;
		border-bottom: 1px solid var(--filet-doux);
	}
	thead th {
		font-size: 13px;
		font-weight: 600;
		color: var(--doux);
		border-bottom-color: var(--filet);
	}
	tbody th {
		padding-left: 20px;
	}
	.sous {
		display: block;
		font-weight: 400;
		font-size: 13px;
		color: var(--doux);
	}
	td.chiffres {
		font-weight: 800;
		font-size: 20px;
		width: 80px;
	}
	.bleu {
		color: var(--bleu-texte);
	}
	.rouge {
		color: var(--rouge-texte);
	}
	.action {
		text-align: right;
		padding-right: 20px;
	}
	.cote {
		flex: 1 1 420px;
		max-width: 560px;
		min-width: 0;
		background: var(--papier);
		padding: 32px 40px 44px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.cote h2 {
		font-size: 18px;
		margin-bottom: 8px;
	}
	.convocation {
		border: 1px solid var(--filet);
		border-radius: var(--r);
		overflow: hidden;
	}
	.convocation .tete {
		background: var(--tableau);
		color: var(--papier);
		padding: 14px 18px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	.cote .convocation .tete h2 {
		margin: 0;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 22px;
	}
	.convocation .tete span {
		font-size: 13px;
		font-weight: 600;
		color: var(--tableau-texte);
	}
	.convocation dl {
		margin: 0;
		padding: 16px 18px;
		display: grid;
		grid-template-columns: 110px minmax(0, 1fr);
		gap: 10px 12px;
		font-size: 15px;
	}
	.convocation dt {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--doux);
	}
	.titre-examen {
		margin: 0;
		padding: 16px 18px 14px;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 24px;
		line-height: 1.1;
	}
	/* Ligne de découpe d'un billet : pointillés et deux encoches. */
	.perforation {
		position: relative;
		margin: 0 14px;
		border-top: 2px dashed var(--filet);
	}
	.perforation::before,
	.perforation::after {
		content: '';
		position: absolute;
		top: -9px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--papier);
		border: 1px solid var(--filet);
	}
	.perforation::before {
		left: -23px;
		clip-path: inset(0 0 0 50%);
	}
	.perforation::after {
		right: -23px;
		clip-path: inset(0 50% 0 0);
	}
	.convocation dd {
		margin: 0;
		font-weight: 600;
	}
	.convocation .pied {
		padding: 0 18px 18px;
	}
	.consultees {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.ref {
		font-size: 18px;
	}
	@media (max-width: 700px) {
		.principal,
		.cote {
			padding: 24px 20px;
		}
	}
</style>
