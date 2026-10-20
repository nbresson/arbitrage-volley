# Arbitrage volley — plateforme de formation des arbitres

Plateforme web de formation des arbitres et marqueurs d'un comité de volley-ball : consultation des règles FIVB, du Casebook et des consignes CFA, entraînement en mode pédagogique (correction + règle citée), examens d'entraînement, examens officiels en salle.

- Ce qu'est le produit et pour qui : [PRODUCT.md](PRODUCT.md)
- Règles visuelles (couleurs, polices, composants) : [DESIGN.md](DESIGN.md) — toute nouvelle couleur y est ajoutée d'abord.
- Conception détaillée : [docs/superpowers/specs/](docs/superpowers/specs/)

## Comment c'est construit

| Partie | Rôle |
|---|---|
| `src/` | Le site (SvelteKit, compilé en site statique). `src/routes/` = les pages, `src/lib/` = composants et logique. |
| `supabase/migrations/` | La structure de la base, les règles d'accès et les fonctions (dans l'ordre). |
| `supabase/functions/creer-compte/` | Seule fonction serveur : création des comptes par un formateur. |
| `supabase/seed/referentiel.sql` | Éditions, niveaux et thèmes de départ. |
| `scripts/import/` | Extraction des règles (PDF) et du Casebook, vérification des brouillons, chargement en base. |
| `data/` | Contenus extraits et brouillons de questions (JSON). |
| `tests/unit/` | Tests sans réseau (`npm test`). |
| `tests/integration/` | Tests contre le projet Supabase de **développement** (`npm run test:integration`). |

La sécurité repose sur la base, pas sur le site : un stagiaire ne peut jamais lire une bonne réponse avant d'avoir répondu, ni pendant un examen ; il ne voit ni le code d'accès ni les questions de la réserve d'examen en dehors de sa propre tentative ; un formateur ne voit jamais les examens d'entraînement.

## Travailler en local

Prérequis : Node 24, `pdftotext` (poppler) pour l'extraction des règles.

1. `npm install`
2. Copier `.env.example` en `.env.local` et le remplir (projet Supabase de développement ; ce fichier n'est jamais versionné).
3. `npm run dev` puis ouvrir http://localhost:5173

Commandes utiles :

| Commande | Effet |
|---|---|
| `npm test` | Tests unitaires |
| `npm run test:integration` | Tests sur la base de développement |
| `npm run check` | Vérification des types |
| `npm run db:dev` | Applique migrations + référentiel à la base de dev |
| `npm run fonctions:dev` | Déploie la fonction `creer-compte` en dev |
| `npm run charger:dev` | Charge règles, cas et brouillons en dev (sans écraser une question relue) |

## Premier formateur

Les comptes se créent depuis **Espace formateur › Stagiaires**. Le tout premier formateur se crée en ligne de commande :

```
npx tsx scripts/db/creer-formateur.ts --cible dev --email prenom.nom@exemple.fr --prenom Prénom --nom Nom
```

Le script affiche un lien d'invitation : l'ouvrir pour choisir le mot de passe.

## Ajouter ou relire une question

Dans **Espace formateur › Questions** : la liste s'ouvre sur les brouillons à relire. Une question n'est proposée aux stagiaires qu'après **« Valider la question »**. Une question d'usage « Réserve d'examen » n'est jamais montrée à l'entraînement.

## Organiser un examen officiel

Un examen officiel se passe **en salle, sous surveillance**. Chaque stagiaire n'a **qu'une tentative**, et ne voit à la fin que son score et « Réussi » ou « Non réussi », jamais la correction.

1. **Préparer les questions.** Dans **Questions**, rédigez des questions avec l'usage **« Réserve d'examen »** et validez-les. Ces questions ne sont jamais montrées à l'entraînement. Les cas du Casebook étant publics, ils ne conviennent pas à la réserve.
2. **Créer l'examen.** Dans **Examens officiels › Créer un examen**, indiquez le titre, la date, le lieu, la durée et le seuil de réussite (en bonnes réponses ; l'écran propose 70 %).
3. **Choisir les questions** dans la réserve (filtres par thème, niveau et rôle), puis les ranger dans l'ordre voulu.
4. **Inscrire les stagiaires** (cases à cocher, ou depuis la fiche d'un stagiaire). La convocation apparaît sur leur accueil.
5. **Le jour J, ouvrir l'examen.** À partir de ce moment, les questions et le seuil ne peuvent plus être modifiés. Un code de 6 chiffres s'affiche en grand : donnez-le aux stagiaires, qui le saisissent pour commencer. Le chronomètre de chacun démarre à ce moment-là.
6. **Suivre la salle.** Le tableau se met à jour toutes les 15 secondes : pas encore commencé, en cours, terminé. Si un stagiaire perd la connexion, ses réponses restent sur son appareil et partent au retour du réseau. S'il ferme son navigateur, il revient avec le même code et reprend là où il en était, dans le temps restant.
7. **Clore l'examen** quand tout le monde a fini. Les copies encore ouvertes sont corrigées avec les réponses déjà reçues ; personne ne peut plus répondre.
8. **Lire les résultats** : dans l'examen (tableau par stagiaire), puis dans la **fiche de chaque stagiaire** (Stagiaires › nom). On y trouve le détail question par question, les règles à retravailler, et l'avancement en mode pédagogique. Les examens d'entraînement restent privés.

Une question de la réserve peut repasser à l'entraînement (usage « Entraînement ») une fois l'examen clos, pas avant.

## Saisir les consignes CFA

Le document de la CFA n'a pas encore été fourni : les consignes se saisissent une par une dans **Espace formateur › Règles**.

1. **Créer une édition**, par exemple « Consignes CFA 2025-2026 ». Elle reste invisible des stagiaires tant qu'elle n'est pas activée.
2. **Ajouter les consignes** : une référence (« CFA 3.2 »), un titre facultatif et le texte.
3. **Activer l'édition.** Elle remplace l'édition CFA précédente. Les questions validées liées à l'ancienne édition passent « à relire » mais restent utilisables.
4. Dans le formulaire d'une question, liez la consigne comme n'importe quelle règle : elle apparaîtra dans l'onglet « Consignes CFA » de la correction, et dans **Règles › Consignes CFA** côté stagiaire.

Une consigne citée par une question validée ne peut pas être supprimée : retirez-la d'abord de la question.

## Nouvelle édition du Casebook ou des Règles

1. Déposer le nouveau document dans `docs/`.
2. Extraire : `npx tsx scripts/import/casebook/parse-casebook.ts docs/<casebook>.md data/casebook-<année>.json` (ou `scripts/import/regles/parse-regles.ts <pdf> <json>`).
3. Rédiger les brouillons des cas nouveaux, puis vérifier : `npx tsx scripts/import/brouillons/valider-brouillons.ts <fichier>`.
4. Charger avec le nom de la nouvelle édition : `npx tsx scripts/import/charger.ts --cible prod --edition-casebook "Casebook 2026"`.
   L'ancienne édition est désactivée (toujours consultable), les questions validées qui s'y rattachent sont marquées « à relire », aucune question relue n'est écrasée.

## Données personnelles

- Projet Supabase hébergé dans l'Union européenne ; données minimales (nom, prénom, e-mail, réponses).
- Désactiver un compte : **Espace formateur › Stagiaires › Désactiver**. La date de désactivation est enregistrée.
- Suppression 2 ans après désactivation (à faire depuis Supabase › Authentication › Users : supprimer l'utilisateur efface aussi son profil, ses séances et ses réponses).

## Comptes techniques du comité

À compléter par le comité : qui détient les accès Supabase (dev et prod), l'hébergement du site, le service d'e-mail et le dépôt de code, pour pouvoir les transmettre d'un bénévole à l'autre.
