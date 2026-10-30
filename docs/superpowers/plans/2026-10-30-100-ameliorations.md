# Plan — 100 améliorations UI/UX

Source : planche « Arbitrage volley — look moderne et 100 améliorations », page 2 (https://claude.ai/artifact/JKiod9XUSkCiDcn9ZzQhNg). Décision de l'utilisateur (2026-10-30) : tout implémenter.

Méthode : un lot par famille de dix, sur la branche `ameliorations-100`. Chaque lot : tests (TDD pour les fonctions pures et les fonctions SQL), `npm run check`, `npm run build`, vérification à l'écran avec des données temporaires sur la base de test, commit en français, puis fusion et mise en ligne avec l'accord de l'utilisateur. Une migration est appliquée en test puis en prod **avant** la mise en ligne du site.

Préférences personnelles (objectif, tri, taille du texte, thème…) : d'abord dans `localStorage` via `src/lib/preferences.ts`, regroupées dans la page « Préférences » du lot F.

| Lot | Famille | Numéros | État |
|---|---|---|---|
| A | Accueil | 1–10 | **fait** (migration `20261030000002_avancement_role`) |
| B | Séance pédagogique | 11–20 | **fait** (migration `20261030000003_seance_enrichie`) ; 15 et 17 : mécanisme en place, contenu à saisir par les formateurs |
| C | Examen blanc et résultats | 21–30 | **fait** (migration `20261030000004_rejouer_examen`) ; seuil des examens blancs : 70 % provisoire (`SEUIL_BLANC`), à confirmer par le comité |
| D | Examen officiel | 31–40 | **fait** (migration `20261031000001_examen_officiel_enrichi`) ; 93 « Connexion rétablie » fait au passage |
| E | Règles et recherche | 41–50 | **fait** (migration `20261031000002_regles_enrichies`) ; 47 et 49 : mécanisme en place (page formateur « Glossaire et figures »), images et définitions à fournir ; 55 fil d’Ariane côté stagiaire fait au passage |
| F | Navigation et compte | 51–60 | **fait** (sans migration) ; thème sombre complet (jetons `--sur-fonce` et `--trait`, DESIGN.md › Thème sombre) ; 58 : soulignement en `--bleu` (pas de turquoise dans le système) ; 83 « Contraste élevé » fait au passage |
| G | Formateur : stagiaires et examens | 61–70 | **fait** sauf 69 (migration `20261031000003_formateur_suivi`) ; **69 « Rappel la veille » non fait : dépend du réglage des e-mails** |
| H | Formateur : questions et contenu | 71–80 | **fait** (migration `20261031000004_questions_suivi`) ; 79 : import par copier-coller ou fichier texte avec découpage assisté (pas de lecture directe des PDF et Word) |
| I | Accessibilité et téléphone | 81–90 | à faire |
| J | Retours, états et performance | 91–100 | à faire |

Points qui dépendent de l'utilisateur ou du comité (à signaler quand le lot arrive) : 15 et 49 (contenu à rédiger), 47 (figures : images à fournir), 69 (e-mails non réglés), 99 (accord sur la mesure d'usage), 100 (décision du comité sur la question posée).
