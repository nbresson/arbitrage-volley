---
version: 1
slug: "training-question"
primary_target: "training/question"
related_targets: []
---

# Écran question — entraînement (mode pédagogique et mode examen)

Mode : Operate. Public : stagiaires arbitres et marqueurs, sur ordinateur, chez eux. Tâche : répondre à une question, comprendre la correction, passer à la suivante. Contenu : énoncé, 4 propositions, explication, règle citée (référence + extrait), sources FIVB / Casebook / CFA. Contraintes : aucune correction sans référence ; mode examen sans correction jusqu'au score final.

Non résolu : nom de la plateforme, liste des niveaux et thèmes.

## Direction contract

THESIS: La séance se compte comme un match : un bandeau-tableau de marque à volets compte question, acquises, à revoir ; refuse le tableau de bord SaaS gris à cartes.

OWN-WORLD: Tableau anthracite #1C2430 en bandeau, sol gris clair #ECEDEA, papier blanc, côtés d'équipe bleu #2856B8 (acquis/correct) et rouge #D2352B (à revoir/incorrect). Chiffres en volets condensés tabulaires (Sofia Sans Condensed), interface en Sofia Sans. Filet pointillé vertical comme séparateur ; filets fins 1px pour les modules.

STORY: Le stagiaire lit la situation, répond, voit immédiatement la décision juste, comprend pourquoi par la règle citée, et voit sa séance avancer au tableau.

FIRST VIEWPORT: Bandeau-tableau 132px en haut (marque à gauche, trois compteurs à volets au centre, navigation à droite). Dessous, deux zones séparées par le filet : à gauche la situation (étiquettes, énoncé 27px, 4 réponses, bouton « Question suivante »), à droite 520px la décision (titre bleu, explication, module de sources à onglets).

FORM: Le tableau de marque, candidat 5 de la liste ordonnée (relance 1). seed:4f32a16fe5c18b91. Signature : les volets du tableau tournent quand une réponse est validée.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
