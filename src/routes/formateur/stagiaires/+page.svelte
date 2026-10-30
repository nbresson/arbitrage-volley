<script lang="ts">
	import EtatVide from '#lib/components/EtatVide.svelte';
	import Chargement from '#lib/components/Chargement.svelte';
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import Courbe from '#lib/components/Courbe.svelte';
	import DialogueConfirmation from '#lib/components/DialogueConfirmation.svelte';
	import { courbesReussite } from '#lib/formateur/courbes.ts';
	import NavFormateur from '#lib/components/NavFormateur.svelte';
	import { referentiel, type Option } from '#lib/data/seances.ts';
	import { session } from '#lib/session.svelte.ts';
	import {
		activiteStagiaires,
		changerActivation,
		creerCompte,
		listerComptes,
		promotionParEmail,
		seancesRecentes,
		type Compte,
		type NouveauCompte
	} from '#lib/data/stagiaires.ts';
	import { analyserListe, filtrerComptes, ilYa, trierComptes, type LigneImport } from '#lib/formateur/suivi.ts';

	let comptes = $state<Compte[]>([]);
	let niveaux = $state<Option[]>([]);
	let courbes = $state(new Map<string, number[]>());
	let etat = $state<'chargement' | 'pret' | 'erreur'>('chargement');
	const vide = (): NouveauCompte & { majeur: '' | 'majeur' | 'mineur' } => ({
		email: '',
		prenom: '',
		nom: '',
		role: 'stagiaire',
		profil_formation: 'arbitre',
		niveau_id: '',
		mineur_parents_informes: false,
		majeur: ''
	});
	let n = $state(vide());
	let erreurs = $state<Record<string, string>>({});
	let message = $state('');
	let erreurEnvoi = $state('');
	let envoi = $state(false);
	let aDesactiver = $state<Compte | null>(null);
	let promotionNouveau = $state('');
	let activite = $state(new Map<string, string>());
	// Tri, recherche et filtre de la liste.
	let recherche = $state('');
	let tri = $state<'nom' | 'niveau' | 'reussite'>('nom');
	let filtrePromotion = $state('');
	// Import d'une liste.
	let texteImport = $state('');
	let communs = $state({ profil_formation: 'arbitre' as 'arbitre' | 'marqueur', niveau_id: '', promotion: '', majeurs: true, parentsInformes: false });
	let apercu = $state<(LigneImport & { resultat?: string; ok?: boolean })[]>([]);
	let importEnCours = $state(false);
	let erreurImport = $state('');

	const promotions = $derived([...new Set(comptes.map((c) => c.promotion).filter(Boolean))].sort() as string[]);
	const reussite = $derived(new Map([...courbes].filter(([, v]) => v.length).map(([id, v]) => [id, v[v.length - 1]])));
	const rangs = $derived(new Map(niveaux.map((x, i) => [x.id, i])));
	const affiches = $derived(trierComptes(filtrerComptes(comptes, recherche, filtrePromotion), tri, { niveaux: rangs, reussite }));
	const valides = $derived(apercu.filter((l) => !l.erreur && !l.ok));

	function verifierImport() {
		erreurImport = '';
		apercu = analyserListe(texteImport);
		if (!apercu.length) erreurImport = 'Collez au moins une ligne : prénom ; nom ; adresse e-mail.';
	}

	async function importer() {
		erreurImport = '';
		if (!communs.niveau_id) return void (erreurImport = 'Choisissez le niveau de ces stagiaires.');
		if (!communs.majeurs && !communs.parentsInformes) return void (erreurImport = 'Pour des mineurs, confirmez que les parents ont été informés.');
		importEnCours = true;
		for (const l of apercu) {
			if (l.erreur || l.ok) continue;
			const r = await creerCompte({
				email: l.email,
				prenom: l.prenom,
				nom: l.nom,
				role: 'stagiaire',
				profil_formation: communs.profil_formation,
				niveau_id: communs.niveau_id,
				mineur_parents_informes: !communs.majeurs
			});
			if (r.ok) {
				await promotionParEmail(l.email, communs.promotion).catch(() => {});
				l.ok = true;
				l.resultat = 'Compte créé, invitation envoyée.';
			} else l.resultat = r.message;
			apercu = [...apercu];
		}
		importEnCours = false;
		charger();
	}

	const charger = () =>
		Promise.all([listerComptes(), referentiel()])
			.then(([c, r]) => ((comptes = c), (niveaux = r.niveaux), (etat = 'pret')))
			.catch(() => (etat = 'erreur'));
	$effect(() => {
		charger();
		activiteStagiaires()
			.then((a) => (activite = a))
			.catch(() => {});
		// Les courbes sont un plus : en cas d'échec, la liste reste utilisable sans elles.
		seancesRecentes()
			.then((s) => (courbes = courbesReussite(s)))
			.catch(() => {});
	});

	const libelleNiveau = (id: string | null) => niveaux.find((x) => x.id === id)?.libelle ?? '—';

	async function creer(e: SubmitEvent) {
		e.preventDefault();
		message = '';
		erreurEnvoi = '';
		erreurs = {};
		if (!n.prenom.trim()) erreurs.prenom = 'Indiquez le prénom.';
		if (!n.nom.trim()) erreurs.nom = 'Indiquez le nom.';
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(n.email.trim())) erreurs.email = 'Indiquez une adresse e-mail valide.';
		if (!n.niveau_id) erreurs.niveau = 'Choisissez un niveau.';
		if (!n.majeur) erreurs.majeur = 'Indiquez si la personne est majeure ou mineure.';
		if (n.majeur === 'mineur' && !n.mineur_parents_informes) erreurs.majeur = 'Pour un mineur, confirmez que les parents ont été informés.';
		if (Object.keys(erreurs).length) return;
		envoi = true;
		const { majeur, ...corps } = n;
		const r = await creerCompte({ ...corps, email: corps.email.trim(), mineur_parents_informes: majeur === 'majeur' ? false : true });
		envoi = false;
		if (r.ok) {
			message = `Compte créé : une invitation a été envoyée à ${n.email.trim()}.`;
			await promotionParEmail(n.email, promotionNouveau).catch(() => {});
			promotionNouveau = '';
			n = vide();
			charger();
		} else erreurEnvoi = r.message;
	}

	async function basculer(c: Compte) {
		try {
			await changerActivation(c.id, !c.actif);
			aDesactiver = null;
			charger();
		} catch {
			erreurEnvoi = 'Le compte n’a pas pu être modifié. Réessayez.';
			aDesactiver = null;
		}
	}
</script>

<svelte:head><title>{'Stagiaires'} · Arbitrage volley</title></svelte:head>

<Bandeau titre="Arbitrage volley" sousTitre="Espace formateur">
	{#snippet navigation()}<NavFormateur />{/snippet}
</Bandeau>

<main class="page">
	<h1 class="titre-page"><span class="surtitre">Espace formateur</span>Stagiaires et formateurs</h1>
	<div class="colonnes">
		<section class="liste">
			{#if etat === 'chargement'}
				<Chargement />
			{:else if etat === 'erreur'}
				<p class="message-erreur" role="alert">Les comptes n’ont pas pu être chargés. Vérifiez votre connexion puis rechargez la page.</p>
			{:else if !comptes.length}
				<EtatVide titre="Aucun compte pour l’instant" texte="Créez le premier avec le formulaire : la personne reçoit une invitation par e-mail." />
			{:else}
				<div class="outils">
					<label class="champ">Chercher un nom<input type="search" bind:value={recherche} autocomplete="off" /></label>
					<label class="champ">Trier par
						<select bind:value={tri}><option value="nom">Nom</option><option value="niveau">Niveau</option><option value="reussite">Réussite (les plus faibles d’abord)</option></select>
					</label>
					{#if promotions.length}
						<label class="champ">Promotion
							<select bind:value={filtrePromotion}><option value="">Toutes</option>{#each promotions as p (p)}<option>{p}</option>{/each}<option value="(sans)">Sans promotion</option></select>
						</label>
					{/if}
				</div>
				<p class="aide" role="status">{affiches.length} compte{affiches.length > 1 ? 's' : ''}{affiches.length < comptes.length ? ` sur ${comptes.length}` : ''}</p>
				<div class="defile">
					<table>
						<caption class="vh">Comptes</caption>
						<thead><tr><th scope="col">Nom</th><th scope="col">Rôle</th><th scope="col">Niveau</th><th scope="col">Réussite <span class="sous-entete">5 dernières séances pédagogiques</span></th><th scope="col">Dernière activité</th><th scope="col">État</th><th scope="col"><span class="vh">Action</span></th></tr></thead>
						<tbody>
							{#each affiches as c (c.id)}
								<tr class:inactif={!c.actif}>
									<th scope="row">{#if c.role === 'stagiaire'}<a class="nom" href="/formateur/stagiaires/{c.id}">{c.prenom} {c.nom}</a>{:else}{c.prenom} {c.nom}{/if}<span class="sous">{c.email ?? ''}{c.promotion ? ` · ${c.promotion}` : ''}</span></th>
									<td>{c.role === 'formateur' ? 'Formateur' : c.profil_formation === 'marqueur' ? 'Marqueur stagiaire' : 'Arbitre stagiaire'}</td>
									<td>{c.role === 'stagiaire' ? libelleNiveau(c.niveau_id) : '—'}</td>
									<td>{#if c.role === 'stagiaire'}<Courbe valeurs={courbes.get(c.id) ?? []} />{/if}</td>
									<td>{c.role === 'stagiaire' ? ilYa(activite.get(c.id) ?? null) : '—'}</td>
									<td>{c.actif ? 'Actif' : 'Désactivé'}</td>
									<td>
										{#if c.id === session.profil?.id}<span class="sous">Votre compte</span>{:else if c.actif}<button class="lien discret" onclick={() => (aDesactiver = c)}>Désactiver…</button>{:else}<button class="lien" onclick={() => basculer(c)}>Réactiver</button>{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		<form class="carte" onsubmit={creer} novalidate>
			<h2>Créer un compte</h2>
			<p class="aide">La personne reçoit un e-mail d’invitation pour choisir son mot de passe.</p>
			<label class="champ">Prénom<input bind:value={n.prenom} autocomplete="off" />{#if erreurs.prenom}<span class="erreur">{erreurs.prenom}</span>{/if}</label>
			<label class="champ">Nom<input bind:value={n.nom} autocomplete="off" />{#if erreurs.nom}<span class="erreur">{erreurs.nom}</span>{/if}</label>
			<label class="champ">Adresse e-mail<input type="email" bind:value={n.email} autocomplete="off" />{#if erreurs.email}<span class="erreur">{erreurs.email}</span>{/if}</label>
			<div class="ligne">
				<label class="champ">Rôle
					<select bind:value={n.role}><option value="stagiaire">Stagiaire</option><option value="formateur">Formateur</option></select>
				</label>
				<label class="champ">Formation
					<select bind:value={n.profil_formation}><option value="arbitre">Arbitre</option><option value="marqueur">Marqueur</option></select>
				</label>
			</div>
			<label class="champ">Promotion <span class="aide">(facultatif)</span>
				<input bind:value={promotionNouveau} list="promotions" autocomplete="off" placeholder="ex. Session automne 2026" />
			</label>
			<datalist id="promotions">{#each promotions as p (p)}<option value={p}></option>{/each}</datalist>
			<label class="champ">Niveau
				<select bind:value={n.niveau_id}><option value="">Choisir…</option>{#each niveaux as x (x.id)}<option value={x.id}>{x.libelle}</option>{/each}</select>
				{#if erreurs.niveau}<span class="erreur">{erreurs.niveau}</span>{/if}
			</label>
			<fieldset>
				<legend>Âge</legend>
				<label class="case"><input type="radio" name="age" value="majeur" bind:group={n.majeur} /> Personne majeure</label>
				<label class="case"><input type="radio" name="age" value="mineur" bind:group={n.majeur} /> Personne mineure</label>
				{#if n.majeur === 'mineur'}
					<label class="case"><input type="checkbox" bind:checked={n.mineur_parents_informes} /> Les parents ont reçu la notice d’information sur les données</label>
				{/if}
				{#if erreurs.majeur}<span class="erreur">{erreurs.majeur}</span>{/if}
			</fieldset>
			{#if erreurEnvoi}<p class="message-erreur" role="alert">{erreurEnvoi}</p>{/if}
			{#if message}<p class="message-info" role="status">{message}</p>{/if}
			<button class="btn" type="submit" disabled={envoi}>{envoi ? 'Création…' : 'Créer le compte'}</button>

			<details class="import">
				<summary>Créer plusieurs comptes d’un coup</summary>
				<div class="contenu-import">
					<p class="aide">Collez une liste depuis un tableur ou un e-mail : une personne par ligne, « prénom ; nom ; adresse e-mail ». Chaque personne reçoit une invitation. Tant que le service d’envoi d’e-mails n’est pas réglé, l’envoi est limité à quelques messages par heure.</p>
					<label class="champ">Liste<textarea bind:value={texteImport} rows="5" placeholder="Camille;Martin;camille.martin@exemple.fr"></textarea></label>
					<button type="button" class="btn2" onclick={verifierImport}>Vérifier la liste</button>
					{#if apercu.length}
						<ul class="apercu">
							{#each apercu as l, i (i)}
								<li class:ko={!!l.erreur || (!!l.resultat && !l.ok)} class:ok={l.ok}>
									<span>{l.prenom} {l.nom} <span class="sous">{l.email}</span></span>
									<span class="etat-ligne">{l.erreur ?? l.resultat ?? 'Prêt'}</span>
								</li>
							{/each}
						</ul>
						<div class="ligne">
							<label class="champ">Formation
								<select bind:value={communs.profil_formation}><option value="arbitre">Arbitre</option><option value="marqueur">Marqueur</option></select>
							</label>
							<label class="champ">Niveau
								<select bind:value={communs.niveau_id}><option value="">Choisir…</option>{#each niveaux as x (x.id)}<option value={x.id}>{x.libelle}</option>{/each}</select>
							</label>
						</div>
						<label class="champ">Promotion <span class="aide">(facultatif)</span><input bind:value={communs.promotion} list="promotions" autocomplete="off" /></label>
						<label class="case"><input type="checkbox" bind:checked={communs.majeurs} /> Toutes ces personnes sont majeures</label>
						{#if !communs.majeurs}
							<label class="case"><input type="checkbox" bind:checked={communs.parentsInformes} /> Les parents ont reçu la notice d’information sur les données</label>
						{/if}
						{#if erreurImport}<p class="message-erreur" role="alert">{erreurImport}</p>{/if}
						<button type="button" class="btn" disabled={!valides.length || importEnCours} onclick={importer}>
							{importEnCours ? 'Création en cours…' : `Créer ${valides.length} compte${valides.length > 1 ? 's' : ''}`}
						</button>
					{:else if erreurImport}
						<p class="message-erreur" role="alert">{erreurImport}</p>
					{/if}
				</div>
			</details>
		</form>
	</div>
</main>

<DialogueConfirmation
	ouvert={!!aDesactiver}
	titre="Désactiver le compte de {aDesactiver?.prenom ?? ''} {aDesactiver?.nom ?? ''} ?"
	texte="La personne ne pourra plus se connecter. Ses résultats sont conservés et le compte peut être réactivé. Les données sont supprimées 2 ans après la désactivation."
	libelleAnnuler="Garder le compte actif"
	libelleConfirmer="Désactiver"
	onannuler={() => (aDesactiver = null)}
	onconfirmer={() => aDesactiver && basculer(aDesactiver)}
/>

<style>
	.page {
		padding: 28px 40px 48px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	h2 {
		margin: 0;
		font-size: 20px;
	}
	.colonnes {
		display: flex;
		flex-wrap: wrap;
		gap: 24px;
		align-items: flex-start;
	}
	.liste {
		flex: 999 1 560px;
		min-width: 0;
	}
	.carte {
		flex: 1 1 340px;
		max-width: 460px;
		background: var(--papier);
		border: 1px solid var(--filet);
		border-radius: var(--r);
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.aide {
		margin: 0;
		color: var(--doux);
		font-size: 14px;
	}
	.ligne {
		display: flex;
		gap: 12px;
	}
	.ligne .champ {
		flex: 1;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	legend {
		font-weight: 600;
		margin-bottom: 6px;
	}
	.case {
		display: flex;
		gap: 8px;
		align-items: flex-start;
	}
	.erreur {
		color: var(--rouge-texte);
		font-weight: 600;
		font-size: 14px;
	}
	.btn {
		align-self: flex-start;
	}
	.defile {
		overflow-x: auto;
	}
	table {
		width: 100%;
		min-width: 600px;
		border-collapse: collapse;
		background: var(--papier);
		border: 1px solid var(--filet);
	}
	th,
	td {
		padding: 12px 16px;
		text-align: left;
		border-bottom: 1px solid var(--filet-doux);
	}
	thead th {
		font-size: 13px;
		font-weight: 600;
		color: var(--doux);
		border-bottom-color: var(--filet);
	}
	.sous {
		display: block;
		font-weight: 400;
		font-size: 13px;
		color: var(--doux);
	}
	.nom {
		color: var(--encre);
		font-weight: 600;
	}
	.inactif {
		color: var(--doux);
	}
	.lien {
		font: inherit;
		background: none;
		border: 0;
		padding: 0;
		color: var(--bleu-texte);
		text-decoration: underline;
		cursor: pointer;
	}
	/* Action rare et lourde : présente, mais pas la plus visible de la ligne. */
	.lien.discret {
		font-size: 14px;
		color: var(--doux);
		text-decoration-color: var(--filet);
	}
	.lien.discret:hover {
		color: var(--encre);
	}
	.sous-entete {
		display: block;
		font-weight: 400;
		font-size: 12px;
	}
	.outils {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-bottom: 8px;
	}
	.outils .champ {
		flex: 1 1 200px;
	}
	.import {
		border-top: 1px solid var(--filet);
		padding-top: 14px;
	}
	.import summary {
		cursor: pointer;
		font-weight: 700;
		min-height: 32px;
	}
	.contenu-import {
		margin-top: 12px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.apercu {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 280px;
		overflow: auto;
		border: 1px solid var(--filet-doux);
		border-radius: var(--r);
	}
	.apercu li {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 4px 12px;
		padding: 8px 10px;
		border-bottom: 1px solid var(--filet-doux);
		font-size: 14px;
	}
	.etat-ligne {
		font-weight: 600;
		color: var(--doux);
	}
	.apercu li.ko .etat-ligne {
		color: var(--rouge-texte);
	}
	.apercu li.ok .etat-ligne {
		color: var(--bleu-texte);
	}
	@media (max-width: 700px) {
		.page {
			padding: 20px;
		}
	}
</style>
