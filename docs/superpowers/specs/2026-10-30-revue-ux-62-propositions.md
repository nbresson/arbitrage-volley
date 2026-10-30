# Revue UX : 62 propositions d'amélioration

Source : planche https://claude.ai/artifact/6BpwwHPc6GgzVZmZuRKk9p (2026-10-30), plugin ux-engine 2.0, méthode ux-auditor : sept audits du code, un par partie du site.

Priorités : P0 casse un parcours ou mène à une mauvaise action ; P1 gêne nettement ; P2 freine ; P3 finition.

## Accueil et compte

**Intention :** le stagiaire revient sur son téléphone pour une courte séance, ou, le jour J, ouvre l’examen officiel ; pire cas : l’examen ouvert est caché par l’entraînement.

**À garder :** la tuile « Reprendre » avec la question et le temps restant, les états vides qui proposent une action, la déconnexion protégée, les préférences appliquées tout de suite.

### 1. [P0] L’examen ouvert caché sous l’entraînement

- **Écran :** Accueil
- **Constat :** Entre 701 et environ 985 px (tablette, petit portable), la convocation et « Commencer l’examen » passent sous le tableau des thèmes. La tuile sombre « Séance d’entraînement » reste l’appel le plus fort, le jour J.
- **Correction :** dès qu’une convocation est ouverte ou en cours, afficher son bloc en tête à toutes les largeurs et retirer le fond sombre de la tuile d’entraînement.

### 2. [P1] Bouton « Se connecter » grisé à l’autoremplissage

- **Écran :** Connexion
- **Constat :** Le bouton reste désactivé tant que les champs semblent vides ; avec l’autoremplissage de Chrome, il paraît mort au premier toucher, sans explication.
- **Correction :** ne le désactiver que pendant l’envoi et vérifier les champs à l’envoi avec un message relié aux champs. Même chose pour « Recevoir un lien ».

### 3. [P1] Textes provisoires visibles des stagiaires

- **Écran :** Connexion, notice, aide, erreur
- **Constat :** « [Comité] » et « [adresse de contact du comité] » apparaissent sept fois ; la notice promet un droit de suppression sans dire à qui écrire.
- **Correction :** deux constantes (nom du comité, adresse de contact) affichées en lien mailto, et un test qui échoue s’il reste un texte entre crochets.

### 4. [P1] Des compteurs « 000 » quand le chargement échoue

- **Écran :** Accueil
- **Constat :** Les volets affichent zéro et un tableau vide, ce qui ressemble à une progression perdue. « Réessayer » recharge toute la page.
- **Correction :** masquer les compteurs tant que rien n’est chargé, prévoir une branche d’erreur sans tableau et un « Réessayer » qui relance seulement le chargement.

### 5. [P1] Le chiffre « À revoir » ne mène nulle part

- **Écran :** Accueil
- **Constat :** Le volet rouge est le chiffre le plus visible de l’accueil, mais aucune action ne relance ces questions.
- **Correction :** ajouter « Revoir mes N questions à revoir », qui crée une séance de ces questions sur le modèle de « Mes questions marquées ».

### 6. [P2] La bienvenue enfouie sous six actions

- **Écran :** Accueil, premier passage
- **Constat :** Le bloc « Trois étapes pour commencer » arrive après les tuiles, les boutons et un objectif « 0/3 » sans objet.
- **Correction :** pour un nouveau stagiaire, placer ce bloc sous le titre et masquer l’objectif de la semaine.

### 7. [P2] Cibles tactiles sous 44 px

- **Écran :** Accueil, menu, préférences
- **Constat :** Filtre de rôle (environ 35 px), tri (33), objectif (25), choix du thème dans le menu (29), options des préférences (32).
- **Correction :** hauteur minimale de 44 px sur chacun de ces contrôles.

### 8. [P2] Échap ne ferme pas le menu du compte

- **Écran :** Toutes les pages
- **Constat :** Au clavier, le menu reste ouvert par-dessus la page.
- **Correction :** fermer à Échap et rendre le focus au rond du compte.

### 9. [P3] Mauvais formulaire affiché, succès muet

- **Écran :** Mot de passe
- **Constat :** « Mot de passe oublié » s’affiche le temps de lire la session ; après l’enregistrement, aucun message.
- **Correction :** squelette tant que la session n’est pas connue, puis « Mot de passe enregistré » et un lien Annuler.

## Séance pédagogique

**Intention :** choisir, valider, lire la décision et sa règle, enchaîner ; pire cas : sur téléphone, perdre sa place entre deux questions ou ne pas retrouver ce qu’on a raté.

**À garder :** les états d’envoi d’une réponse, la correction écrite et pas seulement colorée, « Je ne sais pas » expliqué, les raccourcis désactivables, la reprise annoncée.

### 10. [P1] Focus et défilement perdus entre deux questions

- **Écran :** Séance
- **Constat :** Après « Question suivante », le focus tombe sur la page ; sur téléphone, on reste en bas devant un panneau « Décision » vide.
- **Correction :** mettre le focus et le défilement sur l’énoncé et annoncer « Question n sur N ».

### 11. [P1] « Question suivante » au-dessus de la décision

- **Écran :** Séance, téléphone
- **Constat :** Pendant la lecture de l’explication, le bouton est hors de l’écran, plus haut.
- **Correction :** répéter le bouton sous la décision, ou une barre d’action collante en bas après la correction.

### 12. [P1] Questions ratées incomplètes après une reprise

- **Écran :** Bilan
- **Constat :** La liste ne compte que les réponses données pendant cette visite ; elle est vide après un rechargement, alors que « Revoir mes N erreurs » compte toute la séance.
- **Correction :** lire les questions ratées depuis le serveur.

### 13. [P2] Bilan sans chargement, erreur mal nommée

- **Écran :** Bilan
- **Constat :** « Nouvelle séance » est d’abord bouton principal, puis cède la place ; un échec affiche « La séance n’a pas pu être chargée ».
- **Correction :** squelette du score, actions masquées pendant le calcul, et « Le bilan n’a pas pu être calculé. Vos réponses sont bien enregistrées. » avec Réessayer.

### 14. [P2] Cibles tactiles sous 44 px

- **Écran :** Séance
- **Constat :** « Marquer pour plus tard » (environ 28 px), « Quitter la séance », « Désactiver » du minuteur, onglets des sources (42).
- **Correction :** hauteur minimale de 44 px sur ces contrôles.

### 15. [P2] Onglets des sources incomplets au clavier

- **Écran :** Panneau de décision
- **Constat :** Pas de lien onglet-panneau, pas de flèches ; chaque onglet est un arrêt de tabulation.
- **Correction :** motif d’onglets complet : identifiants, aria-controls, flèches gauche et droite, un seul onglet atteignable par Tab.

### 16. [P2] Impasse « Aucune question ne correspond »

- **Écran :** Nouvelle séance
- **Constat :** La seule sortie proposée est d’élargir le niveau, même quand c’est le thème, le rôle ou la règle qui bloque.
- **Correction :** ouvrir les réglages et proposer l’élargissement adapté : tous les thèmes, les deux rôles, retirer le filtre de règle.

### 17. [P2] Nombre et durée corrigés en silence

- **Écran :** Nouvelle séance
- **Constat :** 3 questions deviennent 5 sans le dire ; la durée d’un examen blanc n’est pas bornée.
- **Correction :** bornes écrites sous les champs et erreur en ligne hors des bornes.

### 18. [P3] « Tous les thèmes » affiché pendant le chargement

- **Écran :** Nouvelle séance
- **Constat :** Arrivé depuis un thème de l’accueil, le résumé le contredit tant que la liste n’est pas chargée.
- **Correction :** « Chargement du thème… » et bouton de lancement désactivé jusque-là.

## Examens côté stagiaire

**Intention :** répondre puis terminer pour que tout soit compté, sur téléphone et avec un réseau instable ; pire cas : une réponse crue donnée n’est pas comptée, ou la tentative unique est close par erreur.

**À garder :** le hors ligne de la passation (file locale, réponses en attente, connexion rétablie, heure du serveur), le dialogue de fin qui met le focus sur « Continuer », le code en six cases.

### 19. [P0] Une réponse cochée mais pas validée est perdue

- **Écran :** Passation
- **Constat :** Cocher puis toucher un numéro de la grille, ou laisser filer le temps : la proposition paraît choisie, mais elle n’est jamais envoyée.
- **Correction :** enregistrer la réponse courante avant tout départ (grille, fin du temps), voire dès le choix.

### 20. [P1] « Terminer l’examen » actif sur un écran vide

- **Écran :** Passation
- **Constat :** Si le chargement échoue, le dialogue annonce « Toutes les questions ont une réponse » et peut clore la tentative officielle unique.
- **Correction :** n’afficher le bouton qu’une fois les questions chargées.

### 21. [P1] Échec de la fin automatique invisible

- **Écran :** Passation
- **Constat :** Au temps écoulé hors ligne, l’erreur reste dans un dialogue fermé et l’envoi est relancé chaque seconde.
- **Correction :** écran « Temps écoulé » : envoi en cours, attente du réseau, puis « Réessayer maintenant ».

### 22. [P2] Confirmation sans état d’attente

- **Écran :** Dialogue de fin
- **Constat :** Un double appui relance la fin ; « Terminer quand même » s’affiche même quand tout est répondu.
- **Correction :** état « Envoi… » qui bloque le bouton et libellé adapté au cas.

### 23. [P2] Code bloqué jusqu’à 15 secondes

- **Écran :** Salle d’examen
- **Constat :** Les six cases restent grisées tant que la page n’a pas vu l’ouverture ; toute la salle attend.
- **Correction :** saisie active, vérification dès que le code est complet, et bouton « Vérifier maintenant ».

### 24. [P2] Cibles sous 44 px pendant l’examen

- **Écran :** Passation
- **Constat :** Cases de la grille à 40 px, bouton « Compris » du bandeau de sortie à environ 30 px.
- **Correction :** cases à 44 px et bouton « Compris » à 44 px de haut.

### 25. [P2] Un verdict qui promet trop

- **Écran :** Résultat d’examen blanc
- **Constat :** « Vous auriez réussi l’examen officiel » repose sur 70 %, alors que chaque formateur fixe le seuil officiel.
- **Correction :** « Au seuil provisoire de 70 %, cet examen serait réussi. »

### 26. [P3] Infobulle de la courbe réservée à la souris

- **Écran :** Mes examens blancs
- **Constat :** Au doigt ou au clavier, la bulle du score ne s’affiche pas.
- **Correction :** réagir au toucher et afficher le dernier point par défaut sur téléphone.

## Règles et recherche

**Intention :** trouver un article ou un cas par numéro ou par mots, le lire, puis s’entraîner dessus ; pire cas : conclure qu’un cas n’existe pas, ou ne pas pouvoir lire une définition sur téléphone.

**À garder :** le tri numérique et la recherche par préfixe, les mots surlignés dans un extrait centré, le sommaire collant, le Casebook en regard, l’impression, l’épingle mise à jour tout de suite.

### 27. [P0] « Cas 3.35 » ne trouve rien

- **Écran :** Règles
- **Constat :** L’exemple du champ cherche dans l’onglet FIVB et affiche « Aucune règle ne correspond », alors que le cas existe dans le Casebook.
- **Correction :** chercher dans toutes les sources avec un badge de source, ou proposer « 3 résultats dans le Casebook » dans l’état vide.

### 28. [P1] Onglets qui débordent

- **Écran :** Règles, téléphone
- **Constat :** Quatre onglets dépassent 600 px et font défiler toute la page en largeur.
- **Correction :** barre d’onglets défilante, ou libellés courts sous 600 px.

### 29. [P1] La recherche de « Mes règles » parcourt tout le règlement

- **Écran :** Règles
- **Constat :** Avec trois règles épinglées, une recherche en renvoie des centaines.
- **Correction :** chercher seulement dans les règles épinglées.

### 30. [P1] Onglet et recherche perdus au retour

- **Écran :** Règles, retour arrière
- **Constat :** Revenir d’une fiche remet l’onglet FIVB et un champ vide ; le fil d’Ariane renvoie aussi vers la liste nue.
- **Correction :** garder la vue et la recherche dans l’adresse, et faire pointer le fil d’Ariane vers la bonne vue.

### 31. [P1] Glossaire inaccessible au toucher

- **Écran :** Fiche d’une règle
- **Constat :** La définition ne s’ouvre qu’au survol ou au focus ; Safari ne donne pas le focus au toucher ; pas d’Échap ; la bulle déborde à droite.
- **Correction :** bouton à bascule (popover), fermeture à Échap ou au toucher ailleurs, bulle maintenue dans l’écran.

### 32. [P1] Cibles de lien trop petites

- **Écran :** Règles et fiche
- **Constat :** Seul le numéro est un lien (environ 30 × 24 px) ; les liens du sommaire font environ 29 px.
- **Correction :** ligne entière cliquable, 44 px de haut au moins.

### 33. [P2] « Recherche des questions liées… » sans fin

- **Écran :** Fiche d’une règle
- **Constat :** En cas d’échec, le message de chargement reste affiché pour toujours.
- **Correction :** état d’erreur avec Réessayer, et un lien direct vers l’entraînement sur la règle.

### 34. [P2] Texte trop étroit sur téléphone

- **Écran :** Fiche, téléphone
- **Constat :** Il reste environ 254 px de texte sur un écran de 360 px.
- **Correction :** marges réduites sous 600 px : environ 40 px de texte en plus.

### 35. [P3] Trois détails de finition

- **Écran :** Règles et fiche
- **Constat :** Aide « touche / » visible au toucher, deux commandes pour le texte anglais, épingle annoncée deux fois au lecteur d’écran.
- **Correction :** masquer l’aide au toucher, garder une seule commande, libellé fixe avec aria-pressed.

## Formateur : stagiaires et mesures

**Intention :** repérer qui décroche, ouvrir sa fiche, l’inscrire à un examen ; pire cas : croire qu’un stagiaire n’a rien fait, ou qu’il est inscrit, alors que c’est faux.

**À garder :** la désactivation confirmée et discrète, l’import en deux temps avec un compte rendu par personne, le détail question par question lisible sans la couleur, la confidentialité rappelée.

### 36. [P1] Faux « Aucune séance »

- **Écran :** Stagiaires
- **Constat :** Un chargement en cours ou en échec s’affiche comme « Aucune séance » ; la lecture est aussi plafonnée à 1 000 séances pour tout le comité.
- **Correction :** états explicites (chargement, échec), et une requête « 5 dernières séances par stagiaire » côté base.

### 37. [P1] Tri « les plus faibles d’abord » à l’envers pour les inactifs

- **Écran :** Stagiaires
- **Constat :** Un stagiaire sans séance part en bas de liste, alors que c’est le profil le plus à risque.
- **Correction :** les stagiaires sans séance en tête, et l’option désactivée tant que les courbes ne sont pas chargées.

### 38. [P1] Inscription en double annoncée comme réussie

- **Écran :** Fiche stagiaire
- **Constat :** La liste propose les examens déjà choisis, le doublon est ignoré en silence, et un compte désactivé reste inscriptible.
- **Correction :** marquer « déjà inscrit », afficher « Inscrit à : … », masquer le bouton pour un compte désactivé.

### 39. [P2] Détail d’examen décalé

- **Écran :** Fiche stagiaire
- **Constat :** La ligne sélectionnée change avant le panneau, qui montre encore l’ancien examen.
- **Correction :** vider le détail au clic et ignorer une réponse arrivée en retard.

### 40. [P2] Promotion perdue sans prévenir

- **Écran :** Stagiaires
- **Constat :** Le message dit « Compte créé » même si la promotion n’a pas été enregistrée.
- **Correction :** « Compte créé, mais la promotion n’a pas été enregistrée : ajoutez-la depuis sa fiche ».

### 41. [P2] Erreur de promotion affichée comme un succès

- **Écran :** Fiche stagiaire
- **Constat :** L’échec a le même petit texte gris que le succès ; le bouton ne montre pas l’envoi.
- **Correction :** message d’erreur distinct et bouton « Enregistrement… ».

### 42. [P2] Message technique en anglais

- **Écran :** Fiche stagiaire
- **Constat :** Une inscription refusée peut afficher le message brut du serveur.
- **Correction :** phrase en français et détail technique dans un volet dépliable.

### 43. [P2] Thèmes non triés, pourcentages fragiles

- **Écran :** Mesures
- **Constat :** « 100 % » sur 2 réponses pèse autant que 62 % sur 400, et le comité doit chercher lui-même le thème faible.
- **Correction :** tri par réussite croissante et lignes grisées sous 20 réponses.

### 44. [P3] En-tête « 5 dernières séances » trompeur

- **Écran :** Stagiaires
- **Constat :** Le chiffre affiché est celui de la dernière séance ; la ligne pointillée n’est pas expliquée.
- **Correction :** moyenne des cinq séances, ou en-tête renommé, et légende de la ligne.

## Formateur : examens officiels

**Intention :** préparer l’examen, l’ouvrir le jour J, donner le code, suivre la salle, clore ; pire cas : ouvrir (irréversible) avec un mauvais seuil, ou chercher le code pendant que la salle attend.

**À garder :** la liste de contrôle avant ouverture, les dialogues aux libellés explicites, le code en plein écran, les états vides qui orientent, les statistiques « À relire ».

### 45. [P0] Ouvrir avec des informations non enregistrées

- **Écran :** Examen
- **Constat :** La liste de contrôle lit le seuil déjà enregistré, pas le formulaire : on peut ouvrir avec l’ancien seuil, sans retour possible.
- **Correction :** un état « modifié » qui bloque l’ouverture ou enregistre d’abord, et une alerte en quittant la page.

### 46. [P1] Le code enterré le jour J

- **Écran :** Examen ouvert
- **Constat :** « En salle » arrive sous le formulaire grisé, les questions et les inscrits ; sur téléphone, plusieurs écrans à faire défiler.
- **Correction :** section « En salle » en tête quand l’examen est ouvert, préparation repliée.

### 47. [P1] Case d’inscription fausse après une erreur

- **Écran :** Examen, inscrits
- **Constat :** Si la désinscription est refusée, la case reste décochée alors que le stagiaire est toujours inscrit.
- **Correction :** remettre la case dans son état réel, nommer le stagiaire dans l’erreur, désactiver la case pendant l’appel.

### 48. [P1] Seuil exigé avant les questions

- **Écran :** Nouvel examen
- **Constat :** Il faut fixer un nombre de bonnes réponses sur un total encore inconnu.
- **Correction :** ne pas l’exiger tant qu’il n’y a pas de questions, et afficher « / N » à côté du champ.

### 49. [P2] Ne dit pas qui compose encore

- **Écran :** Dialogue « Clore »
- **Constat :** Le texte est fixe : on peut couper trois stagiaires en pleine composition sans le savoir.
- **Correction :** « 3 stagiaires encore en cours, 1 sera noté absent. »

### 50. [P2] Annonce répétée toutes les 10 secondes

- **Écran :** En salle
- **Constat :** L’heure de mise à jour est dans la zone lue par le lecteur d’écran.
- **Correction :** sortir l’heure de cette zone : seuls les compteurs sont annoncés.

### 51. [P2] Composer l’examen question par question

- **Écran :** Composition
- **Constat :** Pas de recherche dans la réserve, focus perdu après « Ajouter », 29 clics pour déplacer une question, appels concurrents.
- **Correction :** recherche, « Ajouter les N questions affichées », appels mis en file.

### 52. [P2] L’examen du jour noyé dans la liste

- **Écran :** Liste des examens
- **Constat :** Tri par date décroissante, aucun repère « Aujourd’hui » ni « Date passée ».
- **Correction :** examens ouverts d’abord, brouillons par date croissante, lien « Suivre en salle », cartes sur téléphone.

### 53. [P3] « 0 questions, 0 minutes » au chargement

- **Écran :** Aperçu
- **Constat :** Le bandeau s’affiche avant les données, et le pluriel n’est pas accordé.
- **Correction :** bandeau dans l’état prêt, accord du pluriel, fil d’Ariane avec un titre de repli.

## Formateur : questions et contenus

**Intention :** relire et valider les brouillons, saisir les consignes, tenir le glossaire ; pire cas : publier une question fausse, dépublier ou supprimer sans le vouloir.

**À garder :** la file de relecture et son compteur, la détection des doublons, le vérificateur de qualité, la sauvegarde locale, les confirmations qui disent les conséquences.

### 54. [P1] Écran figé si le chargement échoue

- **Écran :** Glossaire, consignes
- **Constat :** Le glossaire tourne sans fin ; les consignes s’affichent vides (« Saisissez la première ») au lieu d’une erreur.
- **Correction :** état d’erreur avec Réessayer, comme sur les autres pages.

### 55. [P1] « Retirer » supprime sans confirmation

- **Écran :** Glossaire et figures
- **Constat :** Une figure retirée disparaît aussi chez les stagiaires, d’un seul clic.
- **Correction :** dialogue de confirmation, comme pour supprimer une consigne.

### 56. [P1] Le filtre « Brouillons » fait croire la banque vide

- **Écran :** Questions
- **Constat :** Une fois les brouillons validés, l’arrivée affiche « Aucune question ne correspond ».
- **Correction :** statut « Tous » par défaut : « Relire les brouillons » donne déjà l’accès direct.

### 57. [P1] Erreurs de validation introuvables

- **Écran :** Édition d’une question
- **Constat :** Le message, en bas du formulaire, ne nomme aucun champ ; seul l’énoncé est marqué invalide.
- **Correction :** liste des erreurs en liens vers les champs, focus sur le premier champ invalide.

### 58. [P2] La relecture perd sa progression

- **Écran :** Édition, relecture
- **Constat :** Le lien vers le brouillon suivant oublie le mode relecture ; il reste un bouton secondaire.
- **Correction :** garder le mode relecture et en faire le bouton principal après validation.

### 59. [P2] « Repasser en brouillon » dépublie sans prévenir

- **Écran :** Édition d’une question validée
- **Constat :** Collé au bouton principal, il retire la question des stagiaires en un clic.
- **Correction :** lien discret avec confirmation : « Elle ne sera plus proposée aux stagiaires. »

### 60. [P2] « Modifier » remplit un formulaire hors de vue

- **Écran :** Glossaire, consignes
- **Constat :** Avec 40 termes, rien ne semble se passer au clic.
- **Correction :** faire défiler jusqu’au formulaire et y placer le focus.

### 61. [P2] L’import coupe sur tout chiffre en début de ligne

- **Écran :** Consignes CFA, import
- **Constat :** « 2 joueurs se gênent… » ouvre une consigne ; les numéros en double dans le collage ne sont pas repérés.
- **Correction :** exiger un séparateur après le numéro, proposer « Rattacher à la précédente », signaler les doublons.

### 62. [P3] Cibles sous 44 px

- **Écran :** Glossaire, consignes, édition
- **Constat :** Liens « Modifier » et « Retirer » à 32 px, choix de l’édition, bouton radio de la bonne réponse.
- **Correction :** hauteur minimale de 44 px sur ces contrôles.
