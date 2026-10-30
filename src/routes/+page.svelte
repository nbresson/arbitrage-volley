<script lang="ts">
	import { pluriel, titreLisible } from '#lib/domain/texte.ts';
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
	import { avancement, creerSeance, mesSeancesRecentes, referentiel, seanceAReprendre } from '#lib/data/seances.ts';
	import { nouveautesDepuis } from '#lib/data/questions.ts';
	import { mesMarquees, seanceMarquees } from '#lib/data/marquees.ts';
	import { parametresParDefaut } from '#lib/data/parametres-seance.ts';
	import { fichierIcs, joursAvant, seancesDeLaSemaine, serieDeJours, tempsRestantEstime, trierLignes, type TriThemes } from '#lib/domain/accueil.ts';
	import { dateHeure, etatConvocation } from '#lib/examen-officiel/convocation.ts';
	import { enregistrerPreferences, lirePreferences } from '#lib/preferences.ts';
	import { session } from '#lib/session.svelte.ts';

	let av = $state<Avancement[]>([]);
	let reprise = $state<Awaited<ReturnType<typeof seanceAReprendre>>>(null);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	let convocations = $state<Convocation[]>([]);
	let niveau = $state('');
	const consultees = lireConsultations();
	let toutHistorique = $state(false);

	// Préférences locales : objectif, tri, filtre de rôle, date de la dernière visite (nouveautés).
	const prefs = lirePreferences();
	let objectif = $state(prefs.objectifSemaine);
	let tri = $state<TriThemes>(prefs.triThemes);
	let filtreRole = $state<'arbitre' | 'marqueur' | null>(prefs.filtreRole);
	let seancesRecentes = $state<string[]>([]);
	let nouveautes = $state<{ nb: number; themes: string[] } | null>(null);
	let express = $state<'' | 'en_cours' | 'erreur'>('');
	let nbMarquees = $state(0);
	let revision = $state<'' | 'en_cours' | 'erreur'>('');

	async function revoirMarquees() {
		revision = 'en_cours';
		try {
			window.location.assign(`/entrainement/${await seanceMarquees()}`);
		} catch {
			revision = 'erreur';
		}
	}

	function chargerAvancement() {
		return avancement(undefined, filtreRole).then((a) => (av = a));
	}
	function changerFiltre(role: 'arbitre' | 'marqueur' | null) {
		filtreRole = role;
		enregistrerPreferences({ filtreRole: role });
		chargerAvancement().catch(() => (etat = 'erreur'));
	}
	function changerTri(e: Event) {
		tri = (e.target as HTMLSelectElement).value as TriThemes;
		enregistrerPreferences({ triThemes: tri });
	}
	function changerObjectif(e: Event) {
		objectif = Number((e.target as HTMLSelectElement).value);
		enregistrerPreferences({ objectifSemaine: objectif });
	}
	async function seanceExpress() {
		express = 'en_cours';
		try {
			const id = await creerSeance({ ...parametresParDefaut(session.profil!, 'pedagogique'), themeIds: [], niveauId: null, nb: 5 });
			window.location.assign(`/entrainement/${id}`);
		} catch {
			express = 'erreur';
		}
	}

	$effect(() => {
		Promise.all([chargerAvancement(), seanceAReprendre()])
			.then(([, r]) => ((reprise = r), (etat = 'pret')))
			.catch(() => (etat = 'erreur'));
		// Compléments : s'ils échouent, l'accueil reste utilisable sans eux.
		mesSeancesRecentes()
			.then((s) => (seancesRecentes = s))
			.catch(() => {});
		mesMarquees()
			.then((m) => (nbMarquees = m.size))
			.catch(() => {});
		if (prefs.derniereVisite) {
			nouveautesDepuis(prefs.derniereVisite)
				.then((n) => (nouveautes = n.nb > 0 ? n : null))
				.catch(() => {});
		}
		enregistrerPreferences({ derniereVisite: new Date().toISOString() });
		// En cas d'échec, le bloc reste à « Aucun examen officiel prévu » : l'accueil reste utilisable.
		referentiel()
			.then((r) => (niveau = r.niveaux.find((n) => n.id === session.profil?.niveau_id)?.libelle ?? ''))
			.catch(() => {});
		mesConvocations()
			.then((c) => (convocations = c))
			.catch(() => {});
	});

	const lignes = $derived(trierLignes(lignesThemes(av), tri));
	const t = $derived(totaux(av));
	const semaine = $derived(seancesDeLaSemaine(seancesRecentes));
	const serie = $derived(serieDeJours(seancesRecentes));
	const nouveau = $derived(etat === 'pret' && !reprise && t.travaillees === 0 && lignes.length > 0);
	const icsUrl = (c: Convocation) => `data:text/calendar;charset=utf-8,${encodeURIComponent(fichierIcs(c))}`;
	const role = $derived(session.profil?.profil_formation === 'marqueur' ? 'marqueur' : 'arbitre');
	const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
	const aujourdhui = jour.charAt(0).toUpperCase() + jour.slice(1);
</script>

<svelte:head><title>{'Accueil'} · Arbitrage volley</title></svelte:head>

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
					<span><span class="petit">Niveau de formation</span>{niveau}</span>
				</div>
			{/if}
		</div>

		<nav class="tuiles" aria-label="Commencer">
			{#if reprise}
				<a class="tuile sombre" href="/entrainement/{reprise.id}">
					<span class="pastille"><Icone nom="sifflet" taille={26} /></span>
					<span class="nom">Reprendre : {reprise.theme}</span>
					<span class="desc">Question {reprise.index} sur {reprise.total} · {pluriel(reprise.acquises, 'acquise')}, {reprise.aRevoir} à revoir · environ {tempsRestantEstime(reprise.total - reprise.index + 1)} min restantes</span>
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
				<span class="desc">Questions chronométrées, score à la fin sans correction, comme le jour de l’examen.</span>
				<span class="suite">Lancer un examen blanc <Icone nom="fleche" taille={18} /></span>
			</a>
			<a class="tuile papier-reglement" href="/regles">
				<span class="pastille"><Icone nom="regles" taille={26} /></span>
				<span class="nom">Règles officielles</span>
				<span class="desc">Le règlement FIVB, le Casebook et les consignes CFA, avec recherche.</span>
				<span class="suite">Consulter les règles <Icone nom="fleche" taille={18} /></span>
			</a>
		</nav>

			<div class="sous-tuiles">
				<button type="button" class="btn2 express" onclick={seanceExpress} disabled={express === 'en_cours'}>
					<Icone nom="ballon" taille={18} />{express === 'en_cours' ? 'Préparation…' : '5 questions au hasard'}
				</button>
				{#if express === 'erreur'}<span class="message-erreur" role="alert">La séance express n’a pas pu être créée. Réessayez.</span>{/if}
				{#if nbMarquees > 0}
					<button type="button" class="btn2 express" onclick={revoirMarquees} disabled={revision === 'en_cours'}>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"></path></svg>
						{revision === 'en_cours' ? 'Préparation…' : `Mes ${pluriel(nbMarquees, 'question marquée', 'questions marquées')}`}
					</button>
					{#if revision === 'erreur'}<span class="message-erreur" role="alert">La séance n’a pas pu être créée. Réessayez.</span>{/if}
				{/if}
				<a class="btn2 express" href="/examens-blancs"><Icone nom="chrono" taille={18} />Mes examens blancs</a>
				{#if etat === 'pret'}
					<div class="semaine" aria-label="Cette semaine">
						<span class="barre-objectif" aria-hidden="true"><span class="b" style="width: {Math.min(100, (semaine / objectif) * 100)}%"></span></span>
						<label class="objectif">Objectif : <strong>{semaine}/{objectif}</strong>
							<select value={String(objectif)} onchange={changerObjectif} aria-label="Objectif de séances par semaine">
								{#each [1, 2, 3, 5, 7] as n (n)}<option value={String(n)}>{pluriel(n, 'séance')} par semaine</option>{/each}
							</select>
						</label>
						{#if serie >= 2}<span class="serie">{serie} jours d’affilée</span>{/if}
					</div>
				{/if}
			</div>

			{#if nouveau}
				<section class="bienvenue" aria-label="Pour commencer">
					<h2>Bienvenue ! Trois étapes pour commencer</h2>
					<ol>
						<li class="faite"><Icone nom="coche" taille={20} /><span><strong>Vous avez lu la notice</strong> sur vos données.</span></li>
						<li><span class="num">2</span><span><strong>Faites une première séance</strong> : choisissez un thème ci-dessous ou lancez « 5 questions au hasard ». Chaque réponse est corrigée avec la règle.</span></li>
						<li><span class="num">3</span><span><strong>Gardez les règles sous la main</strong> : <a href="/regles">le règlement FIVB, le Casebook et les consignes CFA</a>, avec recherche.</span></li>
					</ol>
				</section>
			{/if}

			{#if nouveautes}
				<section class="nouveautes" aria-label="Nouveautés">
					<Icone nom="questions" taille={22} />
					<p><strong>{pluriel(nouveautes.nb, 'nouvelle question', 'nouvelles questions')}</strong> depuis votre dernière visite{nouveautes.themes.length ? ` : ${nouveautes.themes.slice(0, 3).join(', ')}${nouveautes.themes.length > 3 ? '…' : ''}` : ''}.</p>
				</section>
			{/if}

			<div class="entete-themes">
				<h2>S’entraîner par thème</h2>
				<div class="outils">
					<div class="pastilles" role="group" aria-label="Rôle">
						<button type="button" class:actif={filtreRole === null} onclick={() => changerFiltre(null)}>Tous</button>
						<button type="button" class:actif={filtreRole === 'arbitre'} onclick={() => changerFiltre('arbitre')}>Arbitre</button>
						<button type="button" class:actif={filtreRole === 'marqueur'} onclick={() => changerFiltre('marqueur')}>Marqueur</button>
					</div>
					<label class="tri">Trier
						<select value={tri} onchange={changerTri}>
							<option value="reglement">Ordre du règlement</option>
							<option value="faibles">Faibles d’abord</option>
							<option value="alpha">A → Z</option>
						</select>
					</label>
				</div>
			</div>
		{#if etat === 'chargement'}
			<Chargement />
		{:else if !lignes.length && etat === 'pret'}
			{#if filtreRole}
				<EtatVide titre="Aucune question pour ce rôle" texte="Aucune question validée ne vise les {filtreRole === 'arbitre' ? 'arbitres' : 'marqueurs'} pour l’instant.">
					{#snippet action()}<button type="button" class="btn2" onclick={() => changerFiltre(null)}>Voir tous les rôles</button>{/snippet}
				</EtatVide>
			{:else}
				<EtatVide titre="Aucune question pour l’instant" texte="Vos formateurs sont en train de valider les questions. Revenez bientôt : elles apparaîtront ici, thème par thème." />
			{/if}
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
									<td class="chiffres bleu" data-libelle="Acquises">{l.acquises}</td>
									<td class="chiffres rouge" data-libelle="À revoir">{l.aRevoir}</td>
									<td class="progression"><ProgressionVolets acquises={l.acquises} aRevoir={l.aRevoir} total={l.total} /></td>
									<td class="action"><a class="btn2" href="/entrainement/nouvelle?theme={l.themeId}{filtreRole ? `&role=${filtreRole}` : ''}" aria-label="S’entraîner : {l.theme}">S’entraîner</a></td>
								{:else}
									<td colspan="3" class="aide pas-commence">Pas encore commencé</td>
									<td class="action"><a class="btn2" href="/entrainement/nouvelle?theme={l.themeId}{filtreRole ? `&role=${filtreRole}` : ''}" aria-label="Commencer : {l.theme}">Commencer</a></td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
	<Filet />
	<aside class="cote" class:convoque={convocations.length > 0}>
		{#each convocations as c (c.examen_id)}
			{@const e = etatConvocation(c)}
			{@const dans = joursAvant(c.date_heure)}
			<div class="convocation">
				<div class="bande-filet" aria-hidden="true"></div>
				<div class="tete">
					<h2>Examen officiel</h2>
					<span>{e === 'termine' ? 'Examen passé' : e === 'ouvert' || e === 'en_cours' ? 'Inscription confirmée' : dans > 1 ? `Dans ${dans} jours` : dans === 1 ? 'Demain' : dans === 0 ? 'Aujourd’hui' : 'Inscription confirmée'}</span>
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
						<a class="btn2" href="/entrainement/nouvelle?mode=examen_entrainement">Passer un examen blanc</a>
						<a class="agenda" href={icsUrl(c)} download="{c.titre}.ics"><Icone nom="calendrier" taille={16} />Ajouter à mon agenda</a>
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
				{#snippet action()}<a class="btn2" href="/entrainement/nouvelle?mode=examen_entrainement">Passer un examen blanc</a>{/snippet}
			</EtatVide>
		{/each}
		<div>
			<h2>Règles consultées récemment</h2>
			{#if consultees.length}
				<ul class="consultees">
					{#each toutHistorique ? consultees : consultees.slice(0, 5) as c (c.reference)}
						<li><a class="ref plaque" href="/regles/{slug(c.edition)}/{encodeURIComponent(c.reference)}">{c.reference}</a> <span class="aide">{titreLisible(c.resume)}</span></li>
					{/each}
				</ul>
				{#if consultees.length > 5 && !toutHistorique}<button type="button" class="lien" onclick={() => (toutHistorique = true)}>Tout l’historique ({consultees.length})</button>{/if}
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
	.sous-tuiles {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 24px;
	}
	.express {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.semaine {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		margin-left: auto;
		font-size: 14px;
		color: var(--doux);
	}
	.barre-objectif {
		width: 120px;
		height: 8px;
		border-radius: 2px;
		background: var(--filet-doux);
		overflow: hidden;
	}
	.barre-objectif .b {
		display: block;
		height: 100%;
		background: var(--tableau);
	}
	.objectif select {
		margin-left: 6px;
		font: inherit;
		font-size: 13px;
		border: 1px solid var(--filet);
		border-radius: var(--r-petit);
		background: var(--papier);
		padding: 3px 6px;
	}
	.serie {
		font-weight: 700;
		color: var(--encre);
	}
	.bienvenue {
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.bienvenue ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.bienvenue li {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		line-height: 1.5;
	}
	.bienvenue .num,
	.bienvenue .faite :global(.icone) {
		flex: none;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--tableau);
		color: var(--papier);
		font-family: var(--police-chiffres);
		font-weight: 800;
	}
	.bienvenue .faite :global(.icone) {
		background: var(--bleu);
		padding: 4px;
	}
	.nouveautes {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		background: var(--bleu-clair);
		border: 1px solid var(--bleu);
		border-radius: var(--r);
		color: var(--bleu-texte);
	}
	.nouveautes p {
		margin: 0;
	}
	.entete-themes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 10px 20px;
	}
	.outils {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 14px;
	}
	.pastilles {
		display: inline-flex;
		border: 1px solid var(--filet);
		border-radius: var(--r);
		overflow: hidden;
		background: var(--papier);
	}
	.pastilles button {
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		padding: 7px 12px;
		border: 0;
		background: none;
		color: var(--doux);
		cursor: pointer;
	}
	.pastilles button + button {
		border-left: 1px solid var(--filet);
	}
	.pastilles button.actif {
		background: var(--tableau);
		color: var(--papier);
	}
	.tri {
		font-size: 14px;
		color: var(--doux);
	}
	.tri select {
		margin-left: 6px;
		font: inherit;
		font-size: 14px;
		border: 1px solid var(--filet);
		border-radius: var(--r-petit);
		background: var(--papier);
		padding: 6px 8px;
	}
	.agenda {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 10px;
		font-size: 14px;
		font-weight: 600;
	}
	.lien {
		font: inherit;
		font-size: 14px;
		background: none;
		border: 0;
		padding: 0;
		color: var(--bleu-texte);
		text-decoration: underline;
		cursor: pointer;
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
		/* La convocation passe avant tout le reste quand il y en a une. */
		.cote.convoque {
			order: -1;
		}
		.jeu > :global(.filet) {
			display: none;
		}
		/* Chaque thème devient une carte : nom, compteurs, volets, bouton pleine largeur. */
		.defile {
			overflow: visible;
		}
		table,
		tbody,
		tr,
		th,
		td {
			display: block;
		}
		table {
			min-width: 0;
			border: 0;
			background: none;
		}
		thead {
			display: none;
		}
		tbody {
			display: flex;
			flex-direction: column;
			gap: 10px;
		}
		tbody tr {
			display: grid;
			grid-template-columns: auto auto 1fr;
			align-items: center;
			gap: 10px 16px;
			padding: 14px 16px;
			background: var(--papier);
			border: 1px solid var(--filet);
			border-radius: var(--r);
		}
		th,
		td {
			padding: 0;
			border: 0;
		}
		tbody th {
			grid-column: 1 / -1;
			padding-left: 0;
		}
		td.chiffres {
			width: auto;
			font-size: 18px;
		}
		td[data-libelle]::before {
			content: attr(data-libelle) ' ';
			font-family: var(--police);
			font-size: 13px;
			font-weight: 600;
			color: var(--doux);
		}
		td.progression,
		td.pas-commence,
		td.action {
			grid-column: 1 / -1;
		}
		td.action {
			text-align: left;
		}
		td.action :global(.btn2) {
			display: block;
			width: 100%;
			text-align: center;
		}
	}
</style>
