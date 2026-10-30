# BACKLOG — choses à faire

Liste vivante des améliorations demandées et des petits défauts connus. Le contexte complet (environnement, méthode, pièges) est dans [HANDOFF.md](HANDOFF.md).

## Nouvelles fonctions

### Ordre des réponses des QCM aléatoire (demandé le 2026-10-30)

Mélanger l'ordre des propositions à chaque affichage d'une question, pour qu'on ne retienne pas « c'est la B ».

Points à trancher avant de coder :
- **Ce que veut dire la lettre.** Aujourd'hui la lettre (A, B, C, D) est enregistrée avec la proposition (`propositions.lettre`) et sert à noter la réponse (`reponses`, `tentatives_reponses.lettre`, `bonnes_reponses`). Le plus simple : mélanger seulement l'affichage, et renuméroter A, B, C, D selon la position à l'écran, en gardant en coulisse la lettre d'origine pour l'enregistrement.
- **Explications qui citent une lettre.** Une explication du type « la réponse B est fausse car… » deviendrait fausse une fois mélangée. Vérifier la banque et, si besoin, avertir dans l'éditeur (vérificateur de qualité) quand une explication cite une lettre.
- **Propositions qui dépendent de leur place** (« Aucune des réponses ci-dessus », « A et B »). Prévoir de les garder en dernier ou de désactiver le mélange question par question.
- **Examen officiel.** L'ordre doit rester le même pour un stagiaire s'il recharge la page ou se reconnecte : le tirer une fois par tentative (par exemple à partir de l'identifiant de la tentative) et l'enregistrer avec la copie de l'examen (`examens_questions.propositions`).
- **Revoir une séance ou un examen.** Afficher la correction dans l'ordre que le stagiaire a vu.
- **Raccourcis clavier** (touches 1 à 4 / A à D) : ils suivent l'ordre affiché.

## À surveiller sur le site en ligne

- **Premier vrai examen officiel** : vérifier côté formateur qu'aucun stagiaire n'a de réponse manquante sur sa dernière question (correction de la réponse cochée à la fin du temps). Prévenir les stagiaires de ne pas fermer la page tant que l'écran demande d'attendre l'envoi.
- **Glossaire sur téléphone** : jamais essayé sur un vrai écran tactile. Toucher un mot souligné dans les règles, vérifier que la définition s'ouvre et se referme.
- **Import des consignes CFA** avec le vrai document : relire le découpage avant de valider (doublons décochés, « Rattacher à la précédente »).
- **Ancienne version gardée en mémoire** sur certains téléphones : fermer complètement l'application ou l'onglet puis la rouvrir.

## Petits défauts connus (relecture finale de la revue UX)

- Page mot de passe : le bouton « Annuler » apparaît aussi à la première connexion par invitation, où il ne sert à rien.
- Accueil : le nombre « à revoir » ignore le filtre arbitre / marqueur.
- Page « Nouvelle séance » : bloquée si la liste des thèmes ne se charge pas (recharger la page suffit). En examen par thème, l'élargissement « Tous les thèmes » est à revoir.
- Fin d'examen : si la clôture échoue pour une autre raison que le réseau, l'écran parle quand même de connexion perdue et réessaie sans fin.
- Écran « Temps écoulé » : le focus clavier n'y est pas placé et il n'est pas annoncé aux lecteurs d'écran.
- Fermeture de l'onglet pendant un examen : `beforeNavigate` ne couvre pas ce cas.
- Composition d'un examen (formateur) : « Retirer » n'est pas bloqué pendant l'enregistrement.
- Recherche dans les règles : l'onglet de filtre choisi n'est pas gardé dans l'adresse.
- Bulle du glossaire : `aria-controls` à compléter.
