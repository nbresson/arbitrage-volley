# HANDOFF — reprise des développements

À lire en premier par toute nouvelle session Claude Code. Mis à jour le 2026-10-30 (soir).

## En une phrase

Plateforme web (SvelteKit 3 statique + Supabase) de formation des arbitres de volley-ball d'un comité : règles FIVB, Casebook et consignes CFA consultables, QCM en mode pédagogique (correction + règle citée), examens blancs, examens officiels en salle. **V1 « S'entraîner » et V2 « Évaluer » sont en ligne**, avec deux passes de design (planche de 35 propositions, puis deux audits impeccable). **Chantier en cours : les 100 améliorations UI/UX, lots A et B faits sur la branche `ameliorations-100` (non fusionnée, non en ligne). Reste aussi, avant d'inviter des stagiaires : l'envoi des e-mails.**

## État au 2026-10-30

| Élément | État |
|---|---|
| Site en ligne | https://arbitrage-volley.nkobrs21.workers.dev — **Cloudflare Workers** (pas Pages), site statique décrit par `wrangler.jsonc` |
| Dépôt | https://github.com/nbresson/arbitrage-volley (privé). Branche publiée : `main` (Cloudflare compile à chaque envoi). Branches fusionnées : `v1-sentrainer`, `design-*`, `corrections-audit`, `audit-2`. **Branche en cours : `ameliorations-100`** (2 commits : lots A et B), à fusionner avec l'accord de l'utilisateur |
| Base de **prod** (Supabase, Paris eu-west-3) | 11 migrations appliquées (jusqu'à `20261030000001_revoir_erreurs`). **Pas encore appliquées en prod** : `20261030000002_avancement_role` et `20261030000003_seance_enrichie` (lots A et B) — à appliquer **avant** de mettre la branche en ligne. fonction `creer-compte` déployée, contenu chargé (539 règles, 208 cas, 204 questions **en brouillon**). Auth : Site URL et Redirect URLs = l'adresse du site. Un compte formateur : Nicolas Bresson (nkobrs21@gmail.com) |
| Base de **dev / test** (Supabase, Londres) | 13 migrations (les deux du chantier en plus). Sert aux tests d'intégration et aux vérifications visuelles (données temporaires créées puis supprimées) |
| Réveil de la base | `.github/workflows/reveil-supabase.yml`, tous les 3 jours ; secrets GitHub `SUPABASE_PROD_URL` et `SUPABASE_PROD_ANON_KEY`. Le rôle anon n'a aucun droit : la réponse attendue est « permission refusée » (42501), ce qui suffit à compter comme activité |
| Tests (branche `ameliorations-100`) | `npm test` 190/190 · `npm run test:integration` 122/122 sur `main` + 14 nouveaux (`seance-enrichie`, `seances` rôle) · `npm run check` 0 erreur · `npm run build` OK |
| Audits design (skill impeccable) | 1er : 27/40, 1 P0. 2e (après corrections) : 26/40, 0 P0 — la note varie selon la profondeur de la revue ; tous les points du 1er audit sont confirmés corrigés. Rapports : `.impeccable/critique/` (non versionné) |

## Ce qui reste à faire

### 0. Chantier en cours : les 100 améliorations UI/UX

Plan et suivi : [docs/superpowers/plans/2026-10-30-100-ameliorations.md](docs/superpowers/plans/2026-10-30-100-ameliorations.md) (source : planche https://claude.ai/artifact/JKiod9XUSkCiDcn9ZzQhNg, page 2). Décision de l'utilisateur : tout implémenter, un lot de dix par famille, pause demandée après le lot B.

- **Lot A « Accueil » (1–10) : fait.** Reprise précise, objectif de la semaine et régularité (`src/lib/domain/accueil.ts`), tri et filtre arbitre/marqueur des thèmes (`avancement(p_role)`), compte à rebours et fichier agenda `.ics` de la convocation, historique des règles (5 puis tout), carte « Nouveautés » (questions validées depuis la dernière visite), parcours de bienvenue, séance express de 5 questions. Préférences locales dans `src/lib/preferences.ts` (`localStorage`).
- **Lot B « Séance pédagogique » (11–20) : fait.** Barre de progression, « Je ne sais pas » (`JE_NE_SAIS_PAS`, `valider_reponse` avec proposition nulle), questions marquées (`questions_marquees`, `seance_marquees()`, bouton « Mes questions marquées » sur l'accueil), minuteur 30 s facultatif, explication par mauvaise proposition (`propositions.explication`) et passage surligné (`question_regles.passage`) — **le mécanisme est en place, le contenu reste à saisir par les formateurs dans l'éditeur**, signalement d'un problème (`signalements_question`, lu et traité dans l'éditeur, badge dans la liste), vidéo intégrée, transitions, message de reprise.
- **Prochain lot : C « Examen blanc et résultats » (21–30)**, puis D à J.
- Avant la mise en ligne de la branche : appliquer les deux migrations en prod (`npx tsx scripts/db/appliquer.ts --cible prod`), fusionner dans `main`, pousser, vérifier la publication.

### 1. Envoi des e-mails (bloquant pour inviter des stagiaires)

Supabase utilise son service d'envoi par défaut : quelques e-mails par heure, en anglais, expéditeur générique. Il faut, de la part de l'utilisateur : un compte SMTP gratuit (Brevo proposé, sinon Resend), une adresse d'expédition et idéalement un nom de domaine qu'il gère. Puis : réglage SMTP dans Supabase › Auth (prod), modèles d'invitation et de réinitialisation **en français**, test de bout en bout (invitation → notice → séance).

### 2. Points restants des audits design

- Reportés du 2e audit (remarques mineures, l'utilisateur a choisi de ne pas les traiter) : bouton de connexion grisé sans explication ; sur téléphone, la convocation passe au-dessus du « Bonjour » (`order: -1`, ordre visuel ≠ ordre de lecture) ; module des sources affiché comme onglets même avec une seule source ; triangles natifs des `<details>` dans `/regles` ; « Voir aussi » sans intitulé pour les figures (Fig.9) et les articles absents ; examen en brouillon côté formateur sans la liste de ce qui manque avant ouverture ; formulaire « Créer un compte » toujours ouvert sur la liste des stagiaires ; menu du compte réduit à « Se déconnecter ».
- Propositions de la planche visuelle non faites : **17** photo d'ambiance de la connexion (photo libre de droits à fournir par l'utilisateur) ; **18** schéma de terrain avec positions des joueurs (il faut d'abord stocker des positions par question : vrai chantier) ; **33** pastille d'activité (la date de dernière visite n'est pas enregistrée). Planche : https://claude.ai/artifact/6kHoz9Hd8fWEnxSjeFwZTD

### 3. Contenu (formateurs, dans l'application)

- **Relecture des 204 brouillons** (le bouton « Relire le brouillon suivant » apparaît après chaque validation). Points signalés par les agents de rédaction : cas 3.48, 3.53, 5.27, 9.5 ; énoncés recentrés sur un seul scénario : 2.4, 4.34, 5.4, 5.6, 5.7, 5.23. Cas laissés sans question : 1.11, 3.27.1, 3.27.6, 8.1. Le lien « Cas 1.3 → Fig.9 » n'a pas pu être créé (figure absente).
- **Rédaction de la réserve d'examen** : sans elle, aucun examen officiel ne peut être composé.

### 4. Mineurs techniques reportés (revues V1 et V2)

- Bruit de mise en page dans quelques textes de règles (21.6, 23.3.2.3) ; ~20 renvois vers des articles 25.2.x.y absents de l'extraction ; `scripts/import/charger.ts` ne supprime pas les lignes disparues et n'est pas transactionnel.
- Sous-titre « Sans correction » au lieu du titre de l'examen (`src/routes/tentative/[tentative]/+page.svelte`) ; course rare `commencer_tentative` / `clore_examen` (verrouiller `for share`) ; aucune limite de codes faux ; seuil 70 % jamais proposé ; `enregistrerExamen` annonce « enregistré » sur 0 ligne ; erreur 23503 traduite trop largement ; `activer_edition` marque « à relire » trop large ; bascule réserve → entraînement contournable par l'API ; messages du code « non inscrit » / « clos » identiques ; `signaler_tentative(…, null)` ; pages examen et fiche non réactives à un changement d'identifiant ; tests absents (rôle `anon` sur les fonctions V2, compte désactivé sur `*_tentative`).
- Le test « heure du serveur » de `tests/unit/passation-examen.test.ts` échoue parfois quand la machine est lente (il repasse ensuite).
- **À trancher avec le comité** : fenêtre de 15 min de renvoi hors ligne fondée sur l'heure de l'appareil.

### 5. Décisions ouvertes du comité

Nom de la plateforme (« Arbitrage volley » provisoire), listes des niveaux (Niveau 1/2/3 provisoires) et des thèmes, seuil de réussite, document des consignes CFA, durée de conservation (2 ans proposés), banque de QCM existante, détenteurs des comptes techniques. Placeholders à remplacer dans l'interface : `[Comité]`, `[adresse de contact du comité]`.

## Documents de référence (l'ordre d'autorité)

1. [PRODUCT.md](PRODUCT.md) — utilisateurs, objectifs, contraintes.
2. [docs/superpowers/specs/2026-10-17-plateforme-formation-arbitres-design.md](docs/superpowers/specs/2026-10-17-plateforme-formation-arbitres-design.md) — conception validée.
3. Plans : [V1](docs/superpowers/plans/2026-10-18-v1-sentrainer.md) et [V2](docs/superpowers/plans/2026-10-20-v2-evaluer.md) — toutes les tâches faites, mise en ligne comprise.
4. [DESIGN.md](DESIGN.md) — design system « Le tableau de marque », complété par les deux passes de design (titres de page, surtitres, textures, icônes, plaques, cartons, tuiles, volets de progression, billet, score final, états vides, courbes). **Toute couleur passe par `src/lib/styles/tokens.css`** ; une valeur nouvelle est d'abord ajoutée à DESIGN.md (`tests/unit/tokens.test.ts`).
5. [README.md](README.md) — guide des bénévoles.
6. Maquettes validées : https://claude.ai/artifact/H6CPLUXi29jfN8ujF6MiPZ · planche des 35 propositions : https://claude.ai/artifact/6kHoz9Hd8fWEnxSjeFwZTD

## Environnement et accès

- Windows 11, PowerShell + Git Bash, Node 24. **Pas de Docker** → pas de Supabase local.
- `.env.local` (jamais versionné, **ne jamais afficher ni copier son contenu dans la conversation**) contient :
  - front local : `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` — **pointent vers la base de test**, volontairement ;
  - test : `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, `SUPABASE_TEST_SERVICE_KEY`, `SUPABASE_TEST_DB_URL` ;
  - prod : `SUPABASE_PROD_URL`, `SUPABASE_PROD_ANON_KEY`, `SUPABASE_PROD_SERVICE_KEY`, `SUPABASE_PROD_DB_URL` (Session pooler, pas « Direct connection » qui ne passe pas depuis ce poste) ;
  - `SUPABASE_ACCESS_TOKEN` : jeton du compte qui possède la **prod** ; il ne voit pas le projet de test (réinstaller `creer-compte` en test demanderait l'ancien jeton).
- Pour vérifier qu'une variable est remplie sans l'afficher : longueur et 4 premiers caractères seulement.
- Cloudflare (compte de l'utilisateur) : projet Worker `arbitrage-volley`. Les variables `PUBLIC_SUPABASE_URL` et `PUBLIC_SUPABASE_ANON_KEY` de **production** sont des **variables de compilation** (Paramètres › Compilations), pas d'exécution.
- `.claude/settings.local.json` (non versionné) autorise trois commandes de prod : `npx tsx scripts/db/appliquer.ts --cible prod`, `npm run fonctions:prod`, `npm run charger:prod`.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Site local sur http://localhost:5173 (base de test) |
| `npm test` | Tests unitaires (sans réseau) |
| `npm run test:integration` | Tests sur la base de test (nettoient leurs données) |
| `npm run check` | Types (`svelte-kit sync` + `svelte-check`) |
| `npm run build` | Site statique dans `build/` |
| `npx tsx scripts/db/appliquer.ts --cible dev\|prod` | Applique les migrations (+ référentiel) |
| `npm run fonctions:dev\|prod` | Déploie `creer-compte` |
| `npm run charger:dev\|prod` | Charge règles, cas et brouillons (idempotent) |
| `npx tsx scripts/db/creer-formateur.ts --cible prod --email … --prenom … --nom … --site https://arbitrage-volley.nkobrs21.workers.dev` | Crée un formateur et affiche son lien d'invitation (aucun e-mail envoyé) |

## Mettre en ligne une modification

1. Travailler sur une branche, tests verts (`npm test`, `npm run check`, `npm run build`, intégration si la base change).
2. **Nouvelle migration** : l'appliquer en test, puis **en prod avant** d'envoyer le site (sinon le front appelle une fonction absente).
3. Avec l'accord de l'utilisateur : fusion dans `main` puis `git push origin main` → Cloudflare compile et publie (1 à 2 min).
4. Vérifier la publication en parcourant **tous** les fichiers JS/CSS du site (les pages sont chargées à la demande : chercher un texte nouveau dans `index.html` seul ne suffit pas).
5. **Piège** : il arrive que Cloudflare ne reçoive pas le signal de GitHub et ne compile pas. Vérifier dans le tableau de bord Cloudflare (Workers › arbitrage-volley › Déploiements) ; relancer par un nouvel envoi.

## Pièges connus (à ne pas redécouvrir)

- **SvelteKit 3** : pas de `$env/*` → `import.meta.env.PUBLIC_*` ; alias `#lib/…` **avec extension explicite** ; config dans `vite.config.ts` ; `goto()` sans `keepFocus` / `noScroll`.
- **PostgREST et deux clés vers la même table** : `signalements_question` a deux clés vers `profils` (auteur, traitant) ; un embed doit nommer la clé (`profils!signalements_question_stagiaire_id_fkey(...)`), sinon la requête échoue en silence.
- **Une page `[id]` lit son identifiant au démarrage** : pour passer d'une question, d'une séance ou d'une fiche à une autre, utiliser un rechargement complet (`data-sveltekit-reload` ou `window.location.assign`).
- **Titres d'onglet** : chaque page pose son `<title>` dans `<svelte:head>` ; `src/app.html` garde « Arbitrage volley » en secours.
- **Vitest 5 sans globals** : nettoyage du DOM dans `tests/setup-unit.ts`. Tests de pages : simuler `$app/state`, `$app/navigation` (avec `onNavigate` si le layout est rendu) et les modules `#lib/data/*`.
- **Migrations** : fichiers horodatés ; une migration appliquée ne se modifie pas.
- **Sécurité** : la bonne réponse vit dans `bonnes_reponses` (formateurs seuls) ; en examen blanc, `reponses.correcte` reste NULL ; les formateurs ne lisent jamais les séances `examen_entrainement`. Toute fonction `security definer` : `set search_path = public`, `revoke … from public, anon`. `revoir_erreurs` ne reprend que les questions encore validées d'entraînement d'une séance **du stagiaire appelant**.
- **Fonction `creer-compte`** : `envoyer_email: false` renvoie le lien au lieu d'envoyer un e-mail (tests ; jamais d'e-mail réel vers des adresses fictives).
- **Extraction du PDF des règles** : `pdftotext -raw`. Apostrophe typographique `’` dans les textes officiels. Certains titres sont en capitales : l'affichage passe par `titreLisible()` (`src/lib/domain/texte.ts`).
- **Horloges** : heure de réponse tolérée à ±2 min de celle du serveur.
- **Examens officiels** : le stagiaire ne lit que la copie figée (`examen_questions`) ; il répond par lettre ; le code vit dans `examen_codes` ; écran commun `PassationExamen.svelte`. Un examen en brouillon apparaît déjà au stagiaire comme « à venir » (voulu : il est inscrit).
- **Vérifier à l'écran** : créer des données temporaires sur la base de **test** (comptes `@test.invalid`, questions validées, séances), lancer `npm run dev -- --port 5180 --strictPort`, puis tout supprimer. Arrêter Vite par son numéro de processus si un serveur reste ouvert. Le garde-fou de Claude Code peut refuser la lecture des mots de passe de test par un sous-agent : se connecter soi-même avant de lancer les sous-agents.
- **Règles citées** : un déclencheur refuse la suppression d'une règle citée par une question validée.

## Méthode de travail suivie

- Skills superpowers (brainstorming → spec → plans → exécution, TDD : chaque comportement a un test vu en échec avant le code).
- Design : `impeccable` (critique en deux évaluations indépendantes : revue de design + détecteur), `design-taste-frontend`, planches sur canevas Claude Design. Skill installé le 2026-10-29 : `canvas-design` (affiches et visuels).
- Communication : **en français**, l'utilisateur n'est pas développeur ; demander avant toute action externe (publication, push, fusion, déploiement en prod, e-mails), **à chaque fois**.
- Commits : messages en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
