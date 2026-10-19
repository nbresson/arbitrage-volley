# Arbitrage volley — plateforme de formation des arbitres

Plateforme web de formation des arbitres et marqueurs d'un comité de volley-ball : consultation des règles FIVB et du Casebook, entraînement en mode pédagogique (correction + règle citée), examens d'entraînement.

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

La sécurité repose sur la base, pas sur le site : un stagiaire ne peut jamais lire une bonne réponse avant d'avoir répondu, ni pendant un examen ; un formateur ne voit jamais les examens d'entraînement.

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
