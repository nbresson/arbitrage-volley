# HANDOFF — reprise des développements

À lire en premier par toute nouvelle session Claude Code. Mis à jour le 2026-10-20.

## En une phrase

Plateforme web (SvelteKit 3 statique + Supabase) de formation des arbitres de volley-ball d'un comité : règles FIVB, Casebook et consignes CFA consultables, QCM en mode pédagogique (correction + règle citée), examens d'entraînement, examens officiels en salle. **V1 « S'entraîner » et V2 « Évaluer » codées et testées ; reste la mise en ligne (tâche 18 du plan V1).**

## État au 2026-10-20

| Élément | État |
|---|---|
| Branche de travail | `v1-sentrainer` (V1 + V2, la branche `v2-evaluer` y a été fusionnée le 2026-10-20) — **non fusionnée** dans `main` |
| Plan V1 | [docs/superpowers/plans/2026-10-18-v1-sentrainer.md](docs/superpowers/plans/2026-10-18-v1-sentrainer.md) — tâches 1 à 17 **faites**, tâche 18 (mise en ligne) **à faire** |
| Plan V2 | [docs/superpowers/plans/2026-10-20-v2-evaluer.md](docs/superpowers/plans/2026-10-20-v2-evaluer.md) — tâches 1 à 9 **faites** (exécution directe, revue finale par sous-agent) |
| Tests | `npm test` 151/151 · `npm run test:integration` 116/116 · `npm run check` 0 erreur · `npm run build` OK |
| Vérification manuelle V2 (dev, 2026-10-20) | Création d'examen, composition, inscription, convocation, ouverture et code, mauvais code refusé, coupure réseau simulée, reprise avec le code, résultat « Non réussi » sans correction, clôture, fiche stagiaire, consignes CFA : OK. **Non vérifiés à la main** : l'examen d'entraînement après sa réécriture en composant commun (aucune question d'entraînement validée en dev ; couvert par les tests unitaires) et l'affichage d'une consigne CFA dans la correction d'une question |
| Base de **dev** (Supabase) | Migrations V1 (4) + V2 (`20261020000001` à `…06`) appliquées, fonction `creer-compte` déployée, contenu chargé : 539 règles, 208 cas, 204 questions **en brouillon** (aucune validée), réserve d'examen vide, aucune édition CFA |
| Base de **prod** | N'existe pas encore |
| Site en ligne | Pas encore |

Journaux détaillés de l'exécution (décisions « Ruling », ignorés par Git) : `.superpowers/sdd/<plan>/progress.md`. S'ils ont disparu, l'historique Git fait foi.

## Documents de référence (l'ordre d'autorité)

1. [PRODUCT.md](PRODUCT.md) — utilisateurs, objectifs, contraintes (vérité produit).
2. [docs/superpowers/specs/2026-10-17-plateforme-formation-arbitres-design.md](docs/superpowers/specs/2026-10-17-plateforme-formation-arbitres-design.md) — document de conception validé par l'utilisateur.
3. [docs/superpowers/plans/2026-10-18-v1-sentrainer.md](docs/superpowers/plans/2026-10-18-v1-sentrainer.md) — plan V1.
4. [DESIGN.md](DESIGN.md) — design system « Le tableau de marque ». **Toute couleur ou valeur visuelle passe par `src/lib/styles/tokens.css`** ; une valeur nouvelle est d'abord ajoutée à DESIGN.md (le test `tests/unit/tokens.test.ts` vérifie la concordance).
5. [README.md](README.md) — guide des bénévoles (commandes, import d'une nouvelle édition, données personnelles).
6. Maquettes validées (canevas Claude Design) : https://claude.ai/artifact/H6CPLUXi29jfN8ujF6MiPZ
7. `.impeccable/surfaces/training-question.md` — direction visuelle (skill impeccable).

## Ce qui reste à faire

### Tâche 18 — mise en ligne (bloquée : attend l'utilisateur)

Il faut, de la part de l'utilisateur, **avant de commencer** :
1. Un **projet Supabase de production** (région UE) ; remplir dans `.env.local` : `SUPABASE_PROD_URL`, `SUPABASE_PROD_SERVICE_KEY`, `SUPABASE_PROD_DB_URL`.
2. Un **compte d'hébergement statique** (proposé : Cloudflare Pages, gratuit).
3. Un **dépôt GitHub** (code + tâche planifiée qui réveille la base tous les 3 jours, sinon pause Supabase après 7 jours d'inactivité).
4. L'**adresse d'envoi des e-mails** du comité + un compte SMTP gratuit (Brevo ou Resend) ; traduire en français les modèles d'invitation et de réinitialisation dans Supabase › Auth.

Étapes (détail dans le plan, tâche 18) : `npx tsx scripts/db/appliquer.ts --cible prod` → `npm run fonctions:prod` → `npm run charger:prod` → premier formateur via `scripts/db/creer-formateur.ts --cible prod --site <url du site>` → build et déploiement → URL du site dans Supabase › Auth › Redirect URLs → workflow `.github/workflows/reveil-supabase.yml` → vérification de bout en bout (invitation, notice, séance pédagogique, examen avec coupure réseau, validation d'un brouillon).

Publier, pousser vers GitHub ou fusionner dans `main` : **demander l'accord de l'utilisateur à chaque fois**.

### Après la V1

- **Relecture des 204 brouillons** par les formateurs (dans l'application). Points signalés par les agents de rédaction : cas 3.48, 3.53, 5.27, 9.5 ; énoncés recentrés sur un seul scénario : 2.4, 4.34, 5.4, 5.6, 5.7, 5.23. Cas laissés sans question : 1.11, 3.27.1, 3.27.6, 8.1.
- **Rédaction de la réserve d'examen** par les formateurs : sans elle, aucun examen officiel ne peut être composé (les cas du Casebook, publics, ne conviennent pas).
- **Mineurs reportés par la revue V1** :
  - bruit de mise en page restant dans quelques textes de règles (21.6, 23.3.2.3) ; ~20 renvois vers des articles 25.2.x.y absents de l'extraction ;
  - `scripts/import/charger.ts` ne supprime pas les lignes disparues et n'est pas transactionnel.
  - (réglé en V2 : `src/lib/data/regles.ts` charge désormais les règles par pages de 1000.)
- **Mineurs reportés par la revue V2** (aucun critique ; les 4 importants et la lecture des questions après la fin du temps sont corrigés dans la migration `20261020000006` et le composant d'examen) :
  - le sous-titre de l'écran de passation affiche « Sans correction » au lieu du titre de l'examen (`src/routes/tentative/[tentative]/+page.svelte`) ;
  - course rare `commencer_tentative` / `clore_examen` : verrouiller l'examen (`for share`) dans `commencer_tentative` ;
  - aucune limite de codes faux (force brute possible par un inscrit hors de la salle ; le formateur le verrait « en cours ») ;
  - seuil : la proposition 70 % ne s'applique jamais (seuil exigé à la création) ; rappeler « seuil / nombre de questions » dans la confirmation d'ouverture ; des modifications non enregistrées des informations sont ignorées à l'ouverture ;
  - `enregistrerExamen` annonce « enregistré » si l'examen a été ouvert entre-temps (0 ligne modifiée) ;
  - `examens-formateur.ts` traduit toute erreur 23503 en « déjà commencé » (à limiter à `desinscrire`) ;
  - `activer_edition` marque « à relire » les questions liées à toute édition inactive de la source (pas seulement celle qu'on remplace), et l'aperçu du nombre peut différer ;
  - la bascule réserve → entraînement n'est bloquée que dans `enregistrer_question` (un formateur peut la contourner par l'API) ;
  - écran du code : « non inscrit » et « clos » partagent un message ; un examen en brouillon montre le formulaire du code ;
  - `signaler_tentative(…, null)` lève une erreur brute ; pages examen et fiche non réactives à un changement d'identifiant dans l'URL ;
  - tests absents : rôle `anon` sur les fonctions V2, compte désactivé sur les fonctions `*_tentative` ;
  - **à trancher avec le comité** : la fenêtre de 15 min de renvoi hors ligne repose sur l'heure annoncée par l'appareil ; un stagiaire qui utilise l'API peut antidater des réponses pendant ce délai (il ne peut plus lire les questions après la fin du temps).
- **Décisions ouvertes du comité** (spec § 13) : nom de la plateforme (« Arbitrage volley » provisoire), listes des niveaux (provisoires : Niveau 1/2/3) et des thèmes (rubriques du Casebook), seuil de réussite (V2 : par examen, 70 % proposé par défaut), consignes CFA (document non fourni ; saisie manuelle possible), durée de conservation (proposée : 2 ans), banque de QCM existante (bonne source pour la réserve d'examen), détenteurs des comptes techniques. Dans l'interface, les placeholders `[Comité]`, `[adresse de contact du comité]` sont à remplacer.

## Environnement et accès

- Windows 11, PowerShell + Git Bash, Node 24, `pdftotext` (poppler) installé. **Pas de Docker** → pas de Supabase local : les tests d'intégration tournent contre le projet Supabase **de dev** hébergé.
- `.env.local` (jamais versionné, ne jamais afficher ni copier son contenu dans la conversation) contient : `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (front), `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, `SUPABASE_TEST_SERVICE_KEY`, `SUPABASE_TEST_DB_URL` (dev), `SUPABASE_ACCESS_TOKEN` (déploiement des fonctions), et les `SUPABASE_PROD_*` vides. Modèle : `.env.example`.
- Pour vérifier qu'une variable est remplie sans l'afficher : afficher sa longueur et ses 4 premiers caractères seulement.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Site local sur http://localhost:5173 (base de dev) |
| `npm test` | Tests unitaires (sans réseau) |
| `npm run test:integration` | Tests sur la base de dev (nettoient leurs données) |
| `npm run check` | Types (lance `svelte-kit sync` ; à utiliser plutôt que `svelte-check` seul) |
| `npm run build` | Site statique dans `build/` |
| `npm run db:dev` | Applique les migrations + le référentiel en dev (`scripts/db/appliquer.ts`) |
| `npm run fonctions:dev` | Déploie `creer-compte` en dev (sans Docker, `--use-api`) |
| `npm run charger:dev` | Charge règles, cas et brouillons en dev (idempotent, ne touche pas une question relue) |
| `npx tsx scripts/db/creer-formateur.ts --cible dev --email … --prenom … --nom …` | Crée un formateur et affiche son lien d'invitation (aucun e-mail envoyé) |
| `npx tsx scripts/import/brouillons/valider-brouillons.ts [fichier]` | Vérifie un fichier de brouillons |

## Pièges connus (à ne pas redécouvrir)

- **SvelteKit 3** : pas de `$env/*` → variables via `import.meta.env.PUBLIC_*` (`envPrefix: 'PUBLIC_'` dans `vite.config.ts`) ; alias `#lib/…` **avec extension explicite** (`#lib/auth.ts`), sinon `svelte-check` échoue ; config dans `vite.config.ts` (pas de `svelte.config.js`) ; `goto()` n'accepte pas `keepFocus` / `noScroll`.
- **Vitest 5 sans globals** : le nettoyage du DOM est branché dans `tests/setup-unit.ts`. Tests de pages : simuler `$app/state`, `$app/navigation` et les modules `#lib/data/*` (exemple : `tests/unit/pages-revue.test.ts`).
- **Migrations** : fichiers horodatés `supabase/migrations/2026…_nom.sql` (format exigé par la CLI). Une migration déjà appliquée ne se modifie pas : en créer une nouvelle (`create or replace function …`).
- **Sécurité** : la bonne réponse vit dans `bonnes_reponses` (lisible des seuls formateurs). En examen d'entraînement, `reponses.correcte` reste NULL ; le bilan est calculé par `terminer_seance` et stocké dans `seances.resultat`. Les formateurs ne lisent jamais les séances `examen_entrainement`. Toute nouvelle fonction `security definer` : `set search_path = public` et `revoke … from public, anon, authenticated` si elle est interne (Supabase accorde EXECUTE par défaut).
- **Tests et éditions** : le chargeur désactive les autres éditions d'une même source ; le test `charger.test.ts` restaure les éditions actives. Les tests créent des comptes `@test.invalid` et les suppriment.
- **Fonction `creer-compte`** : `envoyer_email: false` renvoie le lien d'invitation au lieu d'envoyer un e-mail (utilisé par les tests ; ne jamais envoyer d'e-mail réel vers des adresses fictives). Supabase renvoie le compte existant quand on invite une adresse connue : la fonction refuse donc l'adresse avant toute création et ne supprime jamais un compte qui a un profil.
- **Extraction du PDF des règles** : `pdftotext -raw` (pas `-layout`, qui désaligne numéros et textes). Les textes officiels utilisent l'apostrophe typographique `’`.
- **Horloges** : l'heure de réponse annoncée par le navigateur est tolérée à ±2 min de celle du serveur.
- **Examens officiels (V2)** : le stagiaire ne lit que la **copie figée** (`examen_questions`, remplie par `ouvrir_examen`) via les fonctions `*_tentative` ; il répond par **lettre**. Le code vit dans `examen_codes` (formateurs seuls). Le score est calculé par `finaliser_tentative` (interne). L'écran d'examen est commun à l'entraînement et à l'officiel : `src/lib/components/PassationExamen.svelte`, branché par une `SourcePassation`.
- **Vérifier à deux comptes en local** : un onglet sur `http://localhost:5173` et un autre sur `http://127.0.0.1:5173` ont des sessions séparées (lancer `npm run dev -- --host 127.0.0.1`).
- **Règles citées** : un déclencheur refuse la suppression d'une règle (toutes sources) citée par une question validée.

## Méthode de travail suivie

- Skills superpowers : brainstorming → spec → `writing-plans` → `executing-plans` (exécution directe choisie par l'utilisateur, revue finale par un sous-agent sur le modèle le plus capable). TDD : chaque comportement a un test vu en échec avant le code.
- Design : `frontend-design` → `impeccable` → `ux-engine:design-system` ; revue UX avec `ux-engine:ux-audit`.
- Communication avec l'utilisateur : **en français**, il n'est pas développeur ; expliquer les choix en termes simples, demander avant toute action externe (publication, push, déploiement en prod, e-mails).
- Commits : messages en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
