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

### Idées fonctionnelles (proposées le 2026-10-30, à reprendre plus tard)

Classées par utilité. Toutes respectent les contraintes de PRODUCT.md : pas d'IA en fonctionnement, coût minimal, simple à entretenir par des bénévoles.

#### Très utiles

1. **Révisions espacées** : une question ratée revient à J+1, J+3, J+7 ; l'accueil propose « Vos révisions du jour ». Sert directement « comprendre plutôt que mémoriser ».
2. **Neutraliser une question après un examen officiel** : retirée du calcul, scores recalculés pour tous. Équité de l'examen.
3. **Exercices de feuille de match pour les marqueurs** : un déroulé de match (remplacements, temps morts, libéro, sanctions), le stagiaire indique ce qu'il inscrit.
4. **Questions à revoir au changement d'édition FIVB** : liste des questions liées aux articles modifiés, à revoir avant republication (existe déjà pour le CFA).
5. **Devoirs pour une promotion** : série ou thème imposé avec échéance ; le formateur voit qui l'a fait et avec quel score.
6. **Parcours guidé par niveau** : thèmes dans un ordre conseillé, jauge de maîtrise par thème.
7. **Tableau promotion × thèmes** en couleurs : repérer un thème mal compris par toute une promotion.
8. **Composition automatique d'un examen** : répartition fixée (par thème, par niveau), tirage par la plateforme.
9. **Notifications dans le site, sans e-mail** : examen à passer, nouveau devoir, résultat disponible. Contourne le blocage des e-mails.

#### Utiles

10. **Analyse des mauvaises réponses** : quelle proposition fausse attire le plus, par question (vérifier ce que les statistiques par question montrent déjà).
11. **Modèles d'examen réutilisables** d'une session à l'autre, questions renouvelées.
12. **Temps majoré pour un stagiaire** (tiers-temps, aménagement), réglé individuellement.
13. **« Ce qui a changé »** dans les règles FIVB par rapport à l'édition précédente, et dans les consignes CFA de la saison.
14. **Exercices de rotation sur un terrain dessiné** : placer les joueurs, repérer la faute de position.
15. **Gestes officiels de l'arbitre en images** : nommer un geste, ou choisir le geste d'une situation.
16. **Sauvegarde complète de la banque en un fichier** (questions, règles liées, glossaire) : protège le travail des bénévoles.
17. **Gestion automatique des données personnelles** : suppression des comptes inactifs depuis 2 ans, téléchargement de ses données par le stagiaire.
18. **Attestation de réussite** imprimable ou en PDF (date, score, nom du comité).
19. **Relecture par un deuxième formateur** avant validation, avec commentaires internes sur la question.

#### Bonus

20. **Quiz en direct en salle** : question projetée, réponses sur téléphone, résultats en direct.
21. **Question à un formateur** depuis une règle ou une correction, réponse dans le site.
22. **Nouveaux types de questions** : vrai ou faux, plusieurs bonnes réponses, étapes dans l'ordre (à valider selon le format de l'examen réel).
23. **Compte à rebours jusqu'à l'examen** avec rythme conseillé.
24. **Question du jour** commune à la promotion, avec le taux de réussite de la veille.
25. **Notes personnelles sur une règle**, privées, à côté des marque-pages.

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
