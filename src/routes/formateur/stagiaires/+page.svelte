<script lang="ts">
	import '#lib/components/formulaire.css';
	import Bandeau from '#lib/components/Bandeau.svelte';
	import DialogueConfirmation from '#lib/components/DialogueConfirmation.svelte';
	import NavFormateur from '#lib/components/NavFormateur.svelte';
	import { referentiel, type Option } from '#lib/data/seances.ts';
	import { session } from '#lib/session.svelte.ts';
	import { changerActivation, creerCompte, listerComptes, type Compte, type NouveauCompte } from '#lib/data/stagiaires.ts';

	let comptes = $state<Compte[]>([]);
	let niveaux = $state<Option[]>([]);
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

	const charger = () =>
		Promise.all([listerComptes(), referentiel()])
			.then(([c, r]) => ((comptes = c), (niveaux = r.niveaux), (etat = 'pret')))
			.catch(() => (etat = 'erreur'));
	$effect(() => {
		charger();
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

<Bandeau titre="Arbitrage volley" sousTitre="Espace formateur">
	{#snippet navigation()}<NavFormateur />{/snippet}
</Bandeau>

<main class="page">
	<h1 class="titre-page"><span class="surtitre">Espace formateur</span>Stagiaires et formateurs</h1>
	<div class="colonnes">
		<section class="liste">
			{#if etat === 'chargement'}
				<p role="status">Chargement…</p>
			{:else if etat === 'erreur'}
				<p class="message-erreur" role="alert">Les comptes n’ont pas pu être chargés. Vérifiez votre connexion puis rechargez la page.</p>
			{:else if !comptes.length}
				<p>Aucun compte pour l’instant. Créez le premier avec le formulaire.</p>
			{:else}
				<div class="defile">
					<table>
						<caption class="vh">Comptes</caption>
						<thead><tr><th scope="col">Nom</th><th scope="col">Rôle</th><th scope="col">Niveau</th><th scope="col">État</th><th scope="col"><span class="vh">Action</span></th></tr></thead>
						<tbody>
							{#each comptes as c (c.id)}
								<tr class:inactif={!c.actif}>
									<th scope="row">{#if c.role === 'stagiaire'}<a class="nom" href="/formateur/stagiaires/{c.id}">{c.prenom} {c.nom}</a>{:else}{c.prenom} {c.nom}{/if}<span class="sous">{c.email ?? ''}</span></th>
									<td>{c.role === 'formateur' ? 'Formateur' : c.profil_formation === 'marqueur' ? 'Marqueur stagiaire' : 'Arbitre stagiaire'}</td>
									<td>{libelleNiveau(c.niveau_id)}</td>
									<td>{c.actif ? 'Actif' : 'Désactivé'}</td>
									<td>
										{#if c.id === session.profil?.id}<span class="sous">Votre compte</span>{:else if c.actif}<button class="lien" onclick={() => (aDesactiver = c)}>Désactiver…</button>{:else}<button class="lien" onclick={() => basculer(c)}>Réactiver</button>{/if}
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
	@media (max-width: 700px) {
		.page {
			padding: 20px;
		}
	}
</style>
