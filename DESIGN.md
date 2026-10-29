# Design System : plateforme de formation des arbitres de volley

Character : un tableau de marque de gymnase, net et lisible ; on compte sa séance comme un match, et chaque décision renvoie à sa règle.

Valeurs extraites de l'esquisse validée (`.impeccable/mocks/decision/assigned-r1.html`) et de la direction « Le tableau de marque » (`.impeccable/surfaces/training-question.md`). Les valeurs marquées *(supposé)* comblent un manque de l'esquisse et restent à confirmer.

## Couleur

Stratégie : palette engagée sur le bandeau (le tableau occupe tout le haut de l'écran), neutres pour la zone de travail.

- `--tableau` #1C2430 : fond du bandeau-tableau et des boutons principaux. Un anthracite bleuté plutôt qu'un noir : c'est la couleur d'un tableau de marque, et il garde du caractère sur de grandes surfaces.
- `--volet` #262F3D : fond d'un volet à chiffre. Un cran plus clair que le tableau, pour que le volet se détache.
- `--sol` #ECEDEA : fond de la zone de travail. Un gris clair légèrement chaud, comme un sol de salle sous l'éclairage, qui évite le blanc clinique.
- `--papier` #FFFFFF : surfaces de lecture (réponses, décision, tableaux). Le texte réglementaire se lit sur du blanc.
- `--encre` #171B21 : texte principal (≈ 17:1 sur blanc).
- `--doux` #555D68 : texte secondaire, lettres des réponses (≈ 6,5:1 sur blanc, AA).
- `--filet` #C9CCC6 : bordures et séparateurs fins.
- `--bleu` #2856B8 : côté « acquis ». Il signale la bonne réponse, le compteur Acquises et le titre de la décision. Le bleu remplace le vert pour rester lisible par les daltoniens face au rouge, et la différence de clarté avec le rouge s'ajoute à celle de teinte.
- `--bleu-clair` #F1F5FD : fond de la réponse juste.
- `--rouge` #D2352B : côté « à revoir ». Il signale la réponse fausse et le compteur À revoir (≈ 4,6:1 sur blanc).
- `--rouge-clair` #FCF1F0 : fond de la réponse fausse *(supposé)*.
- `--ambre` #9A5B00 : tout ce qui est « en attente ». Il marque le statut brouillon des questions côté formateur et une question signalée « à vérifier » pendant un examen *(supposé)*. Ce n'est ni juste ni faux.
- `--ambre-vif` #E3A43B : marque graphique « à vérifier » (barre sous une case de question). Seul `--ambre` porte du texte, car l'ambre vif n'atteint pas 4,5:1.
- `--ambre-clair` #FFF6E6 : fond du bandeau « hors ligne » et du bouton « Signalée à vérifier » activé.

Nuances dérivées (ajoutées après la revue UX, pour supprimer les valeurs hors système) :
- `--tableau-survol` #2E3A4B : survol des boutons principaux, un cran plus clair que le tableau.
- `--tableau-texte` #C5CDD8 / `--tableau-texte-doux` #AEB7C4 : libellés et sous-titres sur le bandeau (≥ 7:1 sur `--tableau`).
- `--volet-bord` #3A4556 : contour des volets « total » (le /30 d'un score), moins présents que les volets du score.
- `--bleu-texte` #1D4290 : bleu pour du texte sur fond bleu clair et survol des liens.
- `--rouge-texte` #B42A21 : rouge pour du texte (≈ 5,9:1 sur blanc) ; `--rouge` #D2352B reste réservé aux bordures et aux aplats.
- `--desactive` #DCDED9 : fond d'un bouton désactivé (texte `--doux`).
- `--filet-doux` #E3E5E0 : séparateurs entre les lignes d'un tableau, plus discrets que `--filet`.
- `--ligne-survol` #F7F7F5 : survol d'une ligne de tableau, fond des figures.
- `--terrain` #E1E3DE / `--zone-surlignee` #D2DDF3 : fond du schéma de terrain et zone en cause dans la situation.
- Règle : le bleu et le rouge ne servent qu'à l'état (juste ou faux, acquis ou à revoir). Ils ne décorent jamais.
- Exception : les cartons de sanction dessinés (jaune `--ambre-vif`, rouge `--rouge`) représentent des objets réels, toujours accompagnés du nom de la sanction.

## Typographie

- **Sofia Sans** pour toute l'interface et les textes. C'est une grotesque humaniste lisible sur les énoncés longs, avec des accents français soignés.
- **Sofia Sans Condensed** (600/800) pour les chiffres des volets, les lettres des réponses, les titres de décision et les numéros de règle. C'est la voix « tableau de marque », de la même famille, avec des chiffres tabulaires obligatoires (`font-variant-numeric: tabular-nums`).
- Échelle : 13 (étiquettes, méta) / 15 (navigation, texte secondaire, surtitres) / 16 (corps de la décision) / 17 (réponses) / 22 (titres de section) / 27 (énoncé) / 30 (titre de décision) / 40 (titres de page, 32 sur mobile) / 50 (chiffres des volets).
- **Titre de page** (`.titre-page`) : condensée 800 à 40px, le lettrage du tableau de marque. L'énoncé d'une question n'est pas un titre de page : il garde Sofia Sans 600 à 27px.
- **Surtitre** (`.surtitre`) : une ligne courte au-dessus du titre, condensée 600 à 15px, espacée de 0,05em, `--doux` (« Espace formateur », « Jeudi 29 octobre · arbitre stagiaire »). Placé dans le `h1` pour ne pas changer la mise en page.
- Chiffres tabulaires dans tous les tableaux. Le contraste se joue entre l'énoncé à 27 et le reste à 15-17, et entre les volets et tout le reste.
- Graisses : 400 pour le corps, 600 pour l'énoncé et les étiquettes, 700 pour les boutons et les états, 800 (condensée) pour les volets et les numéros de règle.
- Lignes de 80 caractères au plus (`max-width: 31em` sur l'énoncé) ; interligne de 1,38 pour l'énoncé et de 1,6 pour les explications.
- Casse : capitales de phrase partout, jamais de libellés tout en capitales.

## Espacement

- Unité de base : 4px. Échelle : 4 / 8 / 10 / 12 / 16 / 18 / 24 / 32 / 40 / 44.
- Rythme : serré dans un groupe (10px entre les réponses), large entre les zones (32-44px de marge intérieure). Le bandeau mesure 132px de haut, avec un filet blanc de 6px dessous.

## Forme et séparation

- Rayons : 4px pour les étiquettes et les volets, 6px pour les réponses, boutons et modules. Rien de plus arrondi : c'est un équipement de salle, pas un jouet.
- Séparation : **bordures**, jamais d'ombres portées. Filet de 1px (modules) ou 1,5px (réponses). L'état se marque par une bordure de 2px de la couleur d'état, une pastille de lettre pleine de la même couleur et un libellé écrit, jamais par une bande latérale épaisse.
- Le séparateur entre situation et décision est le **filet** : une bande verticale de 6px en pointillé anthracite et blanc (10px / 4px). Il n'apparaît que là.

## Textures

Des matières tirées de la salle, très discrètes (2 à 7 % d'opacité), jamais derrière une réponse ni un énoncé.

- **Lignes du terrain** dans le bandeau : contour, lignes des 3 m et ligne centrale pointillée, en filigrane.
- **Sol de salle** sous toutes les pages : lattes verticales et horizontales à peine visibles.
- **Maille du filet** (`.fond-filet`) : fond des pages d'accès (connexion, mot de passe, notice, compte désactivé).
- **Grain de papier** (`.papier-reglement`) : signale un texte officiel (fiche de règle, module de sources).
- **Bande filet** (`.bande-filet`) : la version horizontale du filet, en tête des convocations et des résultats d'examen.

## Mouvement

- Signature : quand une réponse est validée, le volet qui change tourne (rotation sur l'axe X, 240ms, `cubic-bezier(.3,.7,.4,1)`) ; les chiffres suivants tournent avec 60ms de décalage. C'est la seule animation non déclenchée par un survol.
- Micro-interactions : 150ms ease-out (survol, focus).
- Transitions de page : fondu de 150ms (View Transitions).
- Coup de sifflet : une onde de 420ms autour du bouton « Question suivante » qui apparaît après une validation.
- Chargement : squelettes gris avec un reflet lent, au lieu du mot « Chargement… » (annoncé aux lecteurs d'écran).
- `prefers-reduced-motion` : le chiffre change instantanément, sans rotation ; pas de fondu, d'onde ni de reflet.

## Composants

- **Bandeau-tableau** : marque à gauche, compteurs à volets au centre (Question / 20, Acquises, À revoir), navigation à droite. Le compteur Acquises porte un liseré bas bleu, le compteur À revoir un liseré rouge.
- **Volet** : 46 × 64px, fond `--volet`, chiffre blanc condensé 800 à 50px, ligne de pli horizontale de 2px au milieu.
- **Réponse** : grille [lettre 44px | texte | état], fond papier, bordure filet de 1,5px. États : neutre ; choisie (bordure 2px `--encre`, pastille pleine anthracite) *(supposé)* ; juste (bordure 2px bleue, pastille bleue, fond bleu clair, libellé « Bonne réponse ») ; fausse (bordure 2px rouge, pastille rouge, libellé « Votre réponse ») ; écartée après correction (texte `--doux`). Le libellé écrit accompagne toujours la couleur.
- **Boutons** : principal = fond `--tableau`, texte blanc, 700, padding 14 × 26 ; secondaire = bordure 1,5px `--tableau`, fond transparent *(supposé)* ; dans le bandeau, l'onglet actif est un fond blanc avec un texte `--tableau`.
- **Étiquette** : fond papier, bordure filet de 1px, 13px 600, rayon 4.
- **Badge de réussite** (examen officiel) : le mot « Réussi » ou « Non réussi » est toujours écrit, précédé d'une coche ou d'une croix. Grand (bandeau du résultat) : 18px 700, padding 8 × 14, rayon 4, texte blanc sur `--bleu` (réussi) ou `--rouge` (non réussi), accompagné de « Seuil de réussite : 21 / 30 ». Petit (tableaux) : 13px 700, padding 4 × 9, `--bleu-texte` sur `--bleu-clair` ou `--rouge-texte` sur `--rouge-clair`.
- **Module de sources** : bordure filet, onglets (Règles FIVB / Casebook / Consignes CFA), l'onglet actif est souligné par 3px de bleu ; numéro de règle en condensée 800 à 20px, servant de lien.
- **Icônes** (`Icone`) : trait de 1,75px, bouts arrondis, grille de 24px, couleur du texte. Toujours décoratives et accompagnées d'un libellé : navigation, statuts de question (crayon = brouillon, coche = validée, boîte = archivée, cadenas = réserve d'examen), menu du compte.
- **Plaque de règle** (`.plaque`) : le numéro de règle sur fond `--tableau`, texte blanc, condensée 800, rayon 4, partout où une règle est citée (sauf l'arborescence du règlement).
- **Cartons de sanction** : sous un texte qui cite une sanction, une étiquette par sanction avec ses cartons dessinés (avertissement : jaune ; pénalité : rouge ; expulsion : jaune et rouge ensemble ; disqualification : jaune et rouge séparés). L'avertissement verbal n'a pas de carton.
- **Menu du compte** : rond de 44px aux initiales dans le bandeau ; il ouvre une carte papier avec le nom, le rôle et « Se déconnecter ».
- **Écusson de niveau** : sur l'accueil, le niveau du stagiaire dans un écusson anthracite.
- **Fil d'Ariane** (espace formateur) : étapes en `--doux` séparées par « › », la page courante en `--encre`.
- **Focus clavier** : contour de 2px `--bleu`, décalé de 2px *(supposé)*.

## Voix

- Ton : celui d'un formateur qui explique, direct et factuel. On ne félicite pas et on ne culpabilise pas.
- Libellés : capitales de phrase, des verbes sur les boutons (« Question suivante », « Valider ma réponse », « Lire la règle »).
- Chaque correction cite sa source par son numéro. Aucune correction sans référence.
