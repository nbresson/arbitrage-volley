# Plan — 100 améliorations UI/UX

Source : planche « Arbitrage volley — look moderne et 100 améliorations », page 2 (https://claude.ai/artifact/JKiod9XUSkCiDcn9ZzQhNg). Décision de l'utilisateur (2026-10-30) : tout implémenter.

Méthode : un lot par famille de dix, sur la branche `ameliorations-100`. Chaque lot : tests (TDD pour les fonctions pures et les fonctions SQL), `npm run check`, `npm run build`, vérification à l'écran avec des données temporaires sur la base de test, commit en français, puis fusion et mise en ligne avec l'accord de l'utilisateur. Une migration est appliquée en test puis en prod **avant** la mise en ligne du site.

Préférences personnelles (objectif, tri, taille du texte, thème…) : d'abord dans `localStorage` via `src/lib/preferences.ts`, regroupées dans la page « Préférences » du lot F.

| Lot | Famille | Numéros | État |
|---|---|---|---|
| A | Accueil | 1–10 | **fait** (migration `20261030000002_avancement_role`) |
| B | Séance pédagogique | 11–20 | **fait** (migration `20261030000003_seance_enrichie`) ; 15 et 17 : mécanisme en place, contenu à saisir par les formateurs |
| C | Examen blanc et résultats | 21–30 | **fait** (migration `20261030000004_rejouer_examen`) ; seuil des examens blancs : 70 % provisoire (`SEUIL_BLANC`), à confirmer par le comité |
| D | Examen officiel | 31–40 | **fait** (migration `20261031000001_examen_officiel_enrichi`) ; 94 « Connexion rétablie » fait au passage |
| E | Règles et recherche | 41–50 | à faire |
| F | Navigation et compte | 51–60 | à faire |
| G | Formateur : stagiaires et examens | 61–70 | à faire |
| H | Formateur : questions et contenu | 71–80 | à faire |
| I | Accessibilité et téléphone | 81–90 | à faire |
| J | Retours, états et performance | 91–100 | à faire |

Points qui dépendent de l'utilisateur ou du comité (à signaler quand le lot arrive) : 15 et 49 (contenu à rédiger), 47 (figures : images à fournir), 69 (e-mails non réglés), 99 (accord sur la mesure d'usage), 100 (décision du comité sur la question posée).
