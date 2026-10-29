<script lang="ts">
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import Filet from '#lib/components/Filet.svelte';
	import NavPrincipale from '#lib/components/NavPrincipale.svelte';
	import { lignesThemes, totaux, type Avancement } from '#lib/data/avancement.ts';
	import { lireConsultations, slug } from '#lib/data/regles.ts';
	import { mesConvocations, type Convocation } from '#lib/data/examens-officiels.ts';
	import { avancement, seanceAReprendre } from '#lib/data/seances.ts';
	import { dateHeure, etatConvocation } from '#lib/examen-officiel/convocation.ts';
	import { session } from '#lib/session.svelte.ts';

	let av = $state<Avancement[]>([]);
	let reprise = $state<Awaited<ReturnType<typeof seanceAReprendre>>>(null);
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	let convocations = $state<Convocation[]>([]);
	const consultees = lireConsultations();

	$effect(() => {
		Promise.all([avancement(), seanceAReprendre()])
			.then(([a, r]) => ((av = a), (reprise = r), (etat = 'pret')))
			.catch(() => (etat = 'erreur'));
		// En cas d'échec, le bloc reste à « Aucun examen officiel prévu » : l'accueil reste utilisable.
		mesConvocations()
			.then((c) => (convocations = c))
			.catch(() => {});
	});

	const lignes = $derived(lignesThemes(av));
	const t = $derived(totaux(av));
	const role = $derived(session.profil?.profil_formation === 'marqueur' ? 'marqueur' : 'arbitre');
	const pourcent = (n: number, total: number) => `${Math.round((n / total) * 100)}%`;
</script>

<Bandeau
	titre="Arbitrage volley"
	sousTitre="Bonjour {session.profil?.prenom ?? ''} · {role} stagiaire"
	compteurs={[
		{ valeur: t.travaillees, chiffres: 3, libelle: 'Questions travaillées' },
		{ valeur: t.acquises, chiffres: 3, libelle: 'Acquises', couleur: 'bleu' },
		{ valeur: t.aRevoir, chiffres: 3, libelle: 'À revoir', couleur: 'rouge' }
	]}
	resumeTexte="{t.travaillees} travaillées · {t.acquises} acquises · {t.aRevoir} à revoir"
>
	{#snippet navigation()}<NavPrincipale />{/snippet}
</Bandeau>

<div class="jeu">
	<section class="principal">
		{#if etat === 'erreur'}
			<p class="message-erreur" role="alert">Votre avancement n’a pas pu être chargé. Vérifiez votre connexion puis rechargez la page.</p>
		{/if}

		<div class="carte reprise">
			{#if reprise}
				<div class="texte">
					<h1>Reprendre : {reprise.theme}</h1>
					<p>Mode pédagogique · question {reprise.index} sur {reprise.total} · {reprise.acquises} acquises, {reprise.aRevoir} à revoir</p>
				</div>
				<a class="btn" href="/entrainement/{reprise.id}">Reprendre la séance</a>
			{:else}
				<div class="texte">
					<h1>Commencer une séance</h1>
					<p>Choisissez des thèmes et répondez aux questions : chaque réponse est corrigée avec la règle qui la fonde.</p>
				</div>
				<a class="btn" href="/entrainement/nouvelle">Commencer une séance</a>
			{/if}
		</div>

		<h2>S’entraîner par thème</h2>
		{#if etat === 'chargement'}
			<p role="status">Chargement…</p>
		{:else if !lignes.length && etat === 'pret'}
			<p class="aide">Aucune question n’est encore disponible : vos formateurs sont en train de les valider.</p>
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
								<th scope="row">{l.theme}<span class="sous">{l.total} questions</span></th>
								{#if l.commence}
									<td class="chiffres bleu">{l.acquises}</td>
									<td class="chiffres rouge">{l.aRevoir}</td>
									<td><span class="barre" aria-hidden="true"><span class="b" style="width: {pourcent(l.acquises, l.total)}"></span><span class="r" style="width: {pourcent(l.aRevoir, l.total)}"></span></span></td>
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
				<div class="tete">
					<h2>Examen officiel</h2>
					<span>{e === 'termine' ? 'Examen passé' : 'Vous êtes inscrit'}</span>
				</div>
				<dl>
					<dt>Examen</dt><dd>{c.titre}</dd>
					<dt>Date</dt><dd>{dateHeure(c.date_heure)}</dd>
					{#if c.lieu}<dt>Lieu</dt><dd>{c.lieu}</dd>{/if}
					<dt>Contenu</dt><dd>{c.nb_questions} questions · {c.duree_minutes} minutes</dd>
					{#if c.formateur}<dt>Formateur</dt><dd>{c.formateur}</dd>{/if}
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
			<div class="carte">
				<h2>Aucun examen officiel prévu</h2>
				<p class="aide">Votre formateur vous inscrira ; la convocation apparaîtra ici. En attendant, entraînez-vous dans les conditions de l’examen.</p>
				<a class="btn2" href="/entrainement/nouvelle?mode=examen_entrainement">Passer un examen d’entraînement</a>
			</div>
		{/each}
		<div>
			<h2>Règles consultées récemment</h2>
			{#if consultees.length}
				<ul class="consultees">
					{#each consultees as c (c.reference)}
						<li><a class="ref" href="/regles/{slug(c.edition)}/{encodeURIComponent(c.reference)}">{c.reference}</a> <span class="aide">{c.resume}</span></li>
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
	.carte {
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 22px 24px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.reprise {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px 24px;
	}
	.reprise .texte {
		flex: 1 1 320px;
	}
	h1,
	h2 {
		margin: 0;
		font-size: 22px;
		font-weight: 700;
	}
	.reprise p {
		margin: 6px 0 0;
		color: var(--doux);
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
	.barre {
		display: flex;
		height: 10px;
		border-radius: 2px;
		overflow: hidden;
		background: var(--filet-doux);
	}
	.barre .b {
		background: var(--bleu);
	}
	.barre .r {
		background: var(--rouge);
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
	.cote .carte h2 {
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 22px;
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
		color: var(--doux);
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
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 18px;
		color: var(--encre);
	}
	@media (max-width: 700px) {
		.principal,
		.cote {
			padding: 24px 20px;
		}
	}
</style>
