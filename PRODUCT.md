# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: site statique + Supabase (authentification, base de données, offre gratuite) + vidéos hébergées sur YouTube en « non répertorié ». Choisi pour minimiser le coût de maintenance, contrainte posée par l'utilisateur.

## Users

- **Stagiaires arbitres** (public principal) : personnes en formation d'arbitre ou de marqueur au sein d'un comité de volley-ball. Ils révisent surtout **sur ordinateur, chez eux**, en séances de révision.
- **Formateurs du comité** : inscrivent les stagiaires, rédigent et valident les questions, joignent des vidéos, créent les examens officiels et consultent leurs résultats.

## Product Purpose

Prendre en charge la formation des arbitres dès le début : apprendre les règles, s'entraîner sur des QCM, puis passer des examens. Succès : les stagiaires arrivent à l'examen en ayant compris les règles et leur application, pas en ayant mémorisé des réponses.

## Positioning

Réunit trois sources que les stagiaires consultent aujourd'hui séparément : les Règles officielles FIVB, le Casebook FIVB et les consignes de la Commission Française d'Arbitrage (CFA). Chaque question renvoie à la règle exacte qui la justifie.

## Operating Context

- **Mode pédagogique** : après chaque réponse, correction immédiate, explication et citation de la règle (référence + extrait).
- **Mode examen d'entraînement** : conditions réelles, score à la fin, sans correction ; résultats privés au stagiaire.
- **Examen officiel** : créé par un formateur qui choisit les questions dans la bibliothèque et y inscrit des stagiaires ; le formateur voit les résultats (score, réussite, détail par question). Le stagiaire voit son score sans correction.
- **Bibliothèque de règles** : éléments référencés (articles FIVB, cas du Casebook, consignes CFA) ; une règle est liée à une ou plusieurs questions, et inversement.
- **Bibliothèque de questions** : énoncé, propositions, bonne réponse, explication, niveau de difficulté, thème, rôle cible (marqueur ou arbitre), vidéo optionnelle, règles liées.
- **Alimentation initiale** : import des cas du Casebook transformés en questions (situation → énoncé, décision → bonne réponse, justification → explication) ; propositions de réponses générées à l'import, puis relues et validées par un formateur (statut brouillon → validée).

## Capabilities and Constraints

- Plateforme fermée : comptes créés par les formateurs.
- Deux rôles : formateur, stagiaire.
- Les règles changent par cycle FIVB (édition 2025-2028 en cours) et les consignes CFA par saison : contenus et questions doivent être rattachés à une version.
- Coût de maintenance le plus bas possible ; pas d'IA intégrée en fonctionnement courant.
- Non décidé : nom de la plateforme, liste exacte des niveaux et des thèmes.

## Brand Commitments

Aucune identité imposée par le comité : la plateforme peut avoir sa propre identité.

## Evidence on Hand

L'utilisateur dispose des Règles officielles FIVB, du Casebook FIVB et des consignes CFA (emplacement pas encore communiqué). Aucun chiffre, témoignage ou statistique d'usage : ne pas en inventer.

## Product Principles

1. Toujours relier une réponse à sa source officielle : aucune correction sans référence.
2. Comprendre avant de mémoriser : l'explication compte autant que le score.
3. L'examen doit ressembler à l'examen réel.
4. Les formateurs restent maîtres du contenu : rien n'est publié sans validation humaine.
5. Simple à maintenir pour un comité de bénévoles.

## Accessibility & Inclusion

Pas d'exigence spécifique établie. Viser une lecture confortable de textes réglementaires longs sur ordinateur.
