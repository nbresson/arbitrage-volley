# Plateforme de formation des arbitres de volley-ball — document de conception

Date : 2026-10-17 · Statut : à valider par le porteur du projet

Documents liés :
- [PRODUCT.md](../../../PRODUCT.md) : vérité produit (utilisateurs, objectifs, contraintes).
- [DESIGN.md](../../../DESIGN.md) : design system « Le tableau de marque » (couleurs, typographie, composants), à respecter strictement.
- [.impeccable/surfaces/training-question.md](../../../.impeccable/surfaces/training-question.md) : direction visuelle de l'écran question.
- Maquettes validées (canevas Claude Design) : https://claude.ai/artifact/H6CPLUXi29jfN8ujF6MiPZ (5 écrans : question en mode pédagogique, question en mode examen, résultat d'examen, accueil stagiaire, fiche stagiaire côté formateur).
- Sources : `docs/FIVB-Volleyball_Rules2025_2028-FR-v04.pdf`, `docs/casebook-2025-fr.md`, `docs/FIVB CaseBook 2025_EN.pdf`.

Dans ce document, *(décidé)* signale ce que le porteur du projet a choisi, *(choix de conception)* une décision prise pendant la conception et modifiable, *(au constructeur)* ce qui est laissé à l'équipe qui construit.

---

## 1. Intention

Un comité de volley-ball forme des arbitres et des marqueurs. Aujourd'hui, les stagiaires apprennent le règlement officiel puis passent des QCM par niveaux. Le porteur du projet constate qu'on apprend mieux avec des QCM corrigés immédiatement (réponse + explication + règle), et veut que la plateforme **prenne en charge la formation dès le début**, pas seulement la préparation à l'examen.

La plateforme réunit trois sources que les stagiaires consultent aujourd'hui séparément — les Règles officielles FIVB, le Casebook FIVB et les consignes de la Commission Française d'Arbitrage (CFA) — et **rattache chaque question à la règle exacte qui la justifie**.

Succès : un stagiaire arrive à l'examen en ayant compris les règles et leur application, pas en ayant mémorisé des réponses ; les formateurs savent où en est chaque stagiaire et sur quelles règles revenir avec lui.

## 2. Utilisateurs et rôles *(décidé)*

| Rôle | Qui | Ce qu'il fait |
|---|---|---|
| **Stagiaire** | Arbitre ou marqueur en formation, révise surtout sur ordinateur, chez lui | Consulte les règles, s'entraîne (mode pédagogique), passe des examens d'entraînement, passe les examens officiels auxquels il est inscrit |
| **Formateur** | Membre du comité | Crée les comptes stagiaires, rédige et valide les questions, joint des vidéos, crée des examens officiels, y inscrit des stagiaires, les surveille en salle, consulte leurs résultats et leur avancement en mode pédagogique |

**Ce que voit le formateur** *(décidé)* : l'avancement en **mode pédagogique** (acquises / à revoir par thème et par règle) et les **examens officiels**. Les **examens d'entraînement restent privés** au stagiaire.

**Comptes** *(décidé)* : tous les stagiaires ont une adresse e-mail ; **des mineurs sont possibles** (voir § 7 bis).

Plateforme **fermée** : pas d'inscription libre, les formateurs créent les comptes stagiaires. *(choix de conception : un formateur peut aussi créer un autre compte formateur ; le tout premier formateur est créé à la main dans Supabase.)*

Le rôle cible d'une question (**marqueur** ou **arbitre**) est distinct du rôle applicatif : un stagiaire a un **profil de formation** (arbitre ou marqueur, et un niveau) qui oriente les questions proposées par défaut, sans interdire les autres.

## 3. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
1. Mode pédagogique : correction immédiate, explication, citation de la règle (référence + extrait), lien vers les trois sources.
2. Mode examen d'entraînement : conditions réelles, score à la fin, sans correction ; résultat privé au stagiaire.
3. Examens officiels : passés **en salle, sous surveillance** *(décidé)*, composés par un formateur question par question depuis une **réserve d'examen séparée** *(décidé)* ; résultats visibles par les formateurs (score, réussite, détail par question, règles à retravailler).
4. Bibliothèque de règles navigable par numéro, liée aux questions dans les deux sens.
5. Bibliothèque de questions alimentée d'abord par l'import du Casebook, puis enrichie à la main.
6. Coût de fonctionnement aussi proche de zéro que possible et maintenance accessible à des bénévoles.

**Non-objectifs (pas dans cette version)**
- Application mobile native (le site doit rester utilisable sur téléphone, mais l'ordinateur est la cible).
- IA intégrée en fonctionnement courant (génération ou correction à la volée).
- Inscription publique, paiement, multi-comités.
- Hébergement de vidéos sur la plateforme.
- Gamification (badges, classements entre stagiaires).

**Anti-objectifs (ce qui ferait échouer le projet même si tout « marche »)**
- Une correction affichée **sans sa source** officielle.
- Une question importée publiée **sans relecture humaine** par un formateur.
- Un examen d'entraînement **visible par les formateurs** (rupture de confiance).
- Une question de la **réserve d'examen** visible par un stagiaire en dehors d'un examen officiel (il connaîtrait la réponse à l'avance).
- Une correction affichée **pendant** un examen (mode examen ou officiel).
- Un écran qui s'écarte de DESIGN.md (couleurs, polices, composants inventés).

## 4. Contraintes

- **Langue** : interface et contenus en français.
- **Coût** : offres gratuites (Supabase Free, hébergement statique gratuit) *(décidé : « le moins cher à maintenir »)*.
- **Volume attendu** *(choix de conception, à confirmer)* : quelques formateurs, quelques dizaines de stagiaires par an, quelques centaines à un millier de questions. Pas d'enjeu de performance.
- **Versions** : les règles FIVB changent par cycle (édition en cours : 2025-2028), le Casebook chaque année, les consignes CFA chaque saison. Tout contenu est rattaché à une version.
- **Droits** : le Casebook en français est une **traduction non officielle** (mention présente en tête du fichier). La plateforme étant fermée et à but de formation, on affiche cette mention partout où un texte du Casebook est cité, avec le lien vers le texte anglais qui fait foi.
- **Accessibilité** : niveau AA visé (contraste, clavier, lecteurs d'écran), règles détaillées dans DESIGN.md.

## 5. Les sources de contenu (constat sur les fichiers fournis)

### 5.1 Casebook FIVB 2025 — `docs/casebook-2025-fr.md`
- Markdown très régulier, **208 cas** (`#### Cas 1.1`, `#### Cas 3.35.1`…), regroupés en **9 chapitres** (`## Chapitre N — …`) et en **rubriques** (`### Service`, `### Contre`…).
- Chaque cas contient, dans cet ordre : ancre `<a id="cas-x-y">`, titre (avec parfois `· *nouveau en 2025*` / `· *modifié en 2025*`), lien vidéo optionnel `[▶ Vidéo](http://www.fivbacademy.com/...mp4)`, `**Situation.**`, `**Décision.**`, ligne de règles citées en italique (`*Règles 13.3.6, 19.3.1.4*`), bloc `<details>` avec le texte anglais original.
- Annexe « Cas et règles correspondantes » et glossaire anglais → français en fin de fichier.
- Le PDF anglais (`FIVB CaseBook 2025_EN.pdf`) est la référence qui fait foi ; le texte anglais est déjà repris dans chaque bloc `<details>`.

### 5.2 Règles officielles 2025-2028 — `docs/FIVB-Volleyball_Rules2025_2028-FR-v04.pdf`
- Texte extractible (`pdftotext -layout`, encodage Latin-1 à convertir en UTF-8).
- Articles numérotés hiérarchiques (`19`, `19.3`, `19.3.1`, `19.3.1.4`) ; une colonne de droite contient les **renvois** vers d'autres règles et figures (`1.4.1, 13.3.6, Fig.1b`). La mise en page à deux colonnes demande un nettoyage (coupures de lignes, numéros de page, en-têtes « PARTIE 2 - SECTION 1 »).
- Contient aussi des définitions, des figures et des parties sur les arbitres (règles 22 à 29) utiles aux marqueurs.

### 5.3 Consignes CFA
- **Non fournies à ce jour.** Le modèle de données les prévoit ; elles seront saisies par les formateurs ou importées quand le document sera disponible.

## 6. Modèle de données *(choix de conception)*

Base PostgreSQL (Supabase). Noms indicatifs.

**Référentiel**
- `editions` : une édition d'une source. `id`, `source` (`fivb_regles` | `casebook` | `cfa`), `libelle` (« Règles 2025-2028 », « Casebook 2025 », « Consignes CFA 2025-2026 »), `active` (booléen).
- `regles` : un élément citable. `id`, `edition_id`, `reference` (« 19.3.1.4 », « Cas 3.35.1 », référence CFA), `parent_reference` (« 19.3.1 », pour l'arborescence), `titre` (optionnel), `texte` (français), `texte_original` (anglais, pour le Casebook), `renvois` (liste de références), `video_url` (optionnelle), `ordre` (tri). Unicité (`edition_id`, `reference`).
- `themes` : liste fermée gérée par les formateurs (`id`, `libelle`, `ordre`).
- `niveaux` : liste fermée gérée par les formateurs (`id`, `libelle`, `ordre`).

**Questions**
- `questions` : `id`, `enonce`, `explication`, `niveau_id`, `theme_id`, `role_cible` (`arbitre` | `marqueur` | `les_deux`), `usage` (`entrainement` | `reserve_examen`) *(décidé : réserve d'examen séparée)*, `video_url` (YouTube non répertorié ou vidéo FIVB Academy), `statut` (`brouillon` | `validee` | `archivee`), `a_relire` (booléen, posé quand une règle liée change d'édition), `origine` (`casebook` | `manuelle`), `origine_regle_id` (le cas du Casebook dont elle est issue), `auteur_id`, `valide_par`, `valide_le`, dates. Une question de la réserve ne sert qu'aux examens officiels ; le formateur peut la basculer vers l'entraînement une fois qu'elle a servi *(choix de conception)*.
- `propositions` : `id`, `question_id`, `lettre` (A–D), `texte`, `correcte` (booléen). **Une seule bonne réponse par question** *(choix de conception, cohérent avec les maquettes « une seule réponse possible »)*.
- `question_regles` : lien n–n question ↔ règle, avec `principale` (la règle affichée en premier dans la correction).

**Pratique et examens**
- `profils` : `id` (= utilisateur Supabase Auth), `nom`, `prenom`, `role` (`stagiaire` | `formateur`), `profil_formation` (`arbitre` | `marqueur`), `niveau_id`, `actif`.
- `seances` : une séance d'entraînement ou un examen d'entraînement. `id`, `stagiaire_id`, `type` (`pedagogique` | `examen_entrainement`), `filtre` (thème, niveau, rôle), `nb_questions`, `duree_limite`, `debut`, `fin`.
- `examens_officiels` : `id`, `titre`, `date_heure`, `lieu`, `duree_minutes`, `seuil_reussite`, `code_acces` (code court affiché en salle par le formateur), `cree_par`, `statut` (`brouillon` | `ouvert` | `clos`).
- `examen_questions` : `examen_id`, `question_id`, `ordre`. **Copie figée** : à l'ouverture de l'examen, l'énoncé et les propositions sont copiés (ou versionnés) pour qu'une modification ultérieure de la question ne change pas un examen déjà passé.
- `inscriptions` : `examen_id`, `stagiaire_id`.
- `tentatives` : une passation d'examen officiel. `id`, `examen_id`, `stagiaire_id`, `debut`, `fin`, `score`, `reussi`. **Une seule tentative par stagiaire et par examen** (contrainte d'unicité) ; une tentative interrompue (coupure, fermeture du navigateur) se reprend là où elle en était, dans la limite du temps.
- `reponses` : `id`, `seance_id` ou `tentative_id`, `question_id`, `proposition_id`, `correcte`, `signalee` (« à vérifier »), `repondu_le`.

**Statistiques dérivées** (vues SQL, pas de tables) : acquises / à revoir par thème et par stagiaire, règles les plus manquées par examen.

Définition *(choix de conception)* : une question est **acquise** pour un stagiaire si sa dernière réponse en mode pédagogique est juste ; **à revoir** si elle est fausse. Les compteurs du bandeau-tableau en découlent.

**Changement d'édition** *(choix de conception)* : quand une nouvelle édition d'une source est importée (Casebook chaque année, règles tous les 4 ans), l'ancienne passe `active = false` et reste consultable ; chaque question validée liée à une règle de l'ancienne édition reçoit `a_relire = true` et apparaît dans une file « à relire » côté formateur, mais reste utilisable. Le formateur relie la question à la nouvelle référence (ou l'archive). L'historique « acquises / à revoir » n'est pas remis à zéro. Les examens officiels déjà passés gardent leur copie figée et leurs textes d'origine.

## 7. Sécurité et confidentialité *(choix de conception)*

Row Level Security Supabase sur toutes les tables :
- Stagiaire : lit les règles et les questions **validées d'usage `entrainement`** ; ne lit **jamais** une question `reserve_examen` hors de la tentative d'examen officiel en cours (et alors sans `propositions.correcte`) ; lit et écrit **ses** séances, réponses et tentatives ; lit les examens officiels auxquels il est inscrit.
- Formateur : lit et écrit tout le référentiel et les questions ; lit les séances et réponses **en mode pédagogique** et les tentatives d'examens officiels de tous les stagiaires ; **ne lit pas** les séances ni les réponses des **examens d'entraînement** (anti-objectif).
- La correction (bonne réponse) n'est jamais envoyée au navigateur en mode examen : le calcul du score se fait côté base (fonction SQL / RPC), pas dans le navigateur. En mode pédagogique, la bonne réponse n'est renvoyée qu'après l'enregistrement de la réponse du stagiaire (fonction « valider »).
- Les comptes sont créés par une fonction côté serveur (Supabase Edge Function détenant la clé d'administration), appelée par un formateur.

## 7 bis. Données personnelles et mineurs *(décidé : mineurs possibles ; modalités en choix de conception)*

- Projet Supabase hébergé dans l'**Union européenne** (région Francfort ou Paris).
- Données minimales : nom, prénom, e-mail, profil de formation, niveau, réponses et résultats. Pas de date de naissance, pas de photo.
- Une **notice d'information** (qui traite les données, pourquoi, combien de temps, comment demander la suppression) est affichée à la première connexion ; pour un stagiaire mineur, le formateur s'assure que les parents ont reçu cette information (case à cocher à la création du compte : « stagiaire mineur, information des parents faite »).
- **Conservation** : les données d'un stagiaire sont supprimées 2 ans après la désactivation de son compte *(proposition, à confirmer par le comité)* ; un formateur peut supprimer un compte et ses données à tout moment.
- **E-mails** (invitation, mot de passe oublié) : le service d'e-mail intégré à Supabase est trop limité pour un usage réel ; utiliser un service SMTP externe à offre gratuite *(au constructeur : Brevo, Resend ou équivalent)*, avec une adresse d'envoi du comité.

## 8. Parcours et écrans

### Écrans maquettés (canevas validé)
1. **Question en mode pédagogique** : choisir, valider, voir la décision (titre, explication, schéma si fourni, sources en onglets FIVB / Casebook / CFA), question suivante ; les volets du bandeau comptent question, acquises, à revoir.
2. **Question en mode examen** : choisir, valider et continuer, signaler à vérifier, naviguer dans la grille des questions, compte à rebours, confirmation pour terminer, états « enregistrée » / « hors ligne » / « temps faible ».
3. **Résultat d'examen** : score, réussi / non réussi et seuil, score par thème sans correction, liens pour revoir les thèmes faibles.
4. **Accueil stagiaire** : reprendre, s'entraîner par thème (avec état « pas encore commencé »), convocation à l'examen officiel (ou état « aucun examen prévu »), règles consultées.
5. **Fiche stagiaire (formateur)** : examens officiels passés, détail question par question, règles à retravailler, état « aucun examen ». **À compléter** *(décidé : le formateur voit le mode pédagogique)* : un bloc « Entraînement » avec acquises / à revoir par thème, sur le modèle du tableau des thèmes de l'accueil stagiaire.

### Écrans à concevoir dans le même système (non maquettés)
6. **Connexion** et réinitialisation du mot de passe.
7. **Règles** : arborescence par source et par numéro, recherche par numéro ou mot-clé, fiche d'une règle avec ses renvois et les questions liées (« s'entraîner sur cette règle »).
8. **Lancer une séance** : choix du mode, thème(s), niveau, rôle, nombre de questions (et durée pour un examen d'entraînement).
9. **Formateur — Stagiaires** : liste, création de compte (envoi d'une invitation par e-mail), désactivation.
10. **Formateur — Questions** : liste filtrable (statut, thème, niveau, rôle, origine), file « brouillons à relire », formulaire d'édition (énoncé, 4 propositions, bonne réponse, explication, règles liées, vidéo), action « Valider ».
11. **Formateur — Examens officiels** : création (titre, date, lieu, durée, seuil), sélection des questions depuis la bibliothèque filtrée, inscription des stagiaires, ouverture / clôture, vue des résultats par examen.
12. **Formateur — Règles** : saisie et édition des consignes CFA ; gestion des éditions.

Les formateurs peuvent aussi s'entraîner comme un stagiaire *(choix de conception)*.

### Examen officiel : déroulé *(décidé : en salle, surveillé ; modalités en choix de conception)*
1. Le stagiaire inscrit voit la convocation sur son accueil (date, lieu, contenu, formateur).
2. Le jour J, en salle, sur PC ou tablette, le formateur **ouvre** l'examen et affiche un **code d'accès**. Le stagiaire saisit ce code pour commencer ; sans le bon code, ou avant l'ouverture, l'examen est inaccessible.
3. Le chronomètre part au démarrage de chaque stagiaire, pour la durée fixée ; le serveur refuse toute réponse après `debut + duree` (heure du serveur, pas du navigateur). Le formateur peut **clore** l'examen pour tous.
4. **Une seule tentative.** Si le navigateur se ferme ou la connexion coupe, le stagiaire reprend sa tentative avec le même code, dans la limite du temps restant. Les réponses gardées hors ligne ne comptent que si elles ont été données avant la fin du temps.
5. À la fin, le stagiaire voit son score et son résultat (réussi / non réussi), sans correction (écran 3, sans les liens « revoir » propres à l'entraînement).
6. Pas de verrouillage technique du navigateur (onglets, copier-coller) : la surveillance en salle en tient lieu.

## 9. Import du contenu

### 9.1 Règles FIVB *(choix de conception)*
Script ponctuel (Node ou Python) : extraction `pdftotext`, découpage par numéro d'article, nettoyage de la mise en page, extraction des renvois de la colonne de droite, génération d'un fichier JSON relu puis chargé dans `regles` (édition « Règles 2025-2028 »). Les figures ne sont pas importées en V1 (seulement leur référence en renvoi). Une relecture humaine par échantillonnage est prévue, car la mise en page deux colonnes est la principale source d'erreurs.

### 9.2 Casebook *(décidé : on importe les cas et on ajoute des propositions de réponses)*
1. **Parsing** du fichier `casebook-2025-fr.md` → un enregistrement `regles` par cas (source `casebook`, référence « Cas 3.35.1 », texte = Situation + Décision, texte original anglais, vidéo, règles citées en renvois, chapitre et rubrique).
2. **Génération des brouillons de questions**, travail ponctuel hors plateforme, réalisé avec l'aide de Claude dans une session de développement (pas d'IA en fonctionnement courant) ; le résultat est un fichier JSON versionné dans le dépôt, puis chargé en base. Pour chaque cas :
   - énoncé = la situation reformulée en question de décision (« Quelle est votre décision ? ») ;
   - bonne réponse = la décision, résumée en une phrase ;
   - trois propositions fausses mais plausibles (les erreurs que ferait réellement un stagiaire) ;
   - explication = la décision du Casebook, reformulée si besoin ;
   - règles liées = les règles citées par le cas + le cas lui-même ;
   - thème proposé = la rubrique du Casebook ; niveau et rôle proposés.
3. Chargement en **statut `brouillon`** et d'usage `entrainement` ; un formateur relit, corrige et valide avant tout usage. Les questions de la réserve d'examen sont rédigées à part par les formateurs (le Casebook étant public, ses cas ne conviennent pas à une réserve secrète).
4. Certains cas ne se prêtent pas à un QCM à une seule bonne réponse (questions ouvertes, cas à plusieurs décisions successives) : ils sont importés comme règles consultables mais signalés « sans question » plutôt que forcés en QCM.

### 9.3 Consignes CFA
Saisie manuelle par les formateurs (écran 12) en attendant le document ; import possible plus tard sur le même modèle.

## 10. Technique *(décidé : site statique + Supabase + vidéos YouTube non répertoriées)*

- **Front-end** : application monopage statique *(choix de conception : Vite + TypeScript ; le choix d'un framework léger — aucun, Svelte ou Vue — est laissé au constructeur, avec un critère : qu'un bénévole puisse maintenir le code)*.
- **Back-end** : Supabase (Auth par e-mail + mot de passe et invitations, PostgreSQL, RLS, fonctions SQL pour le calcul des scores). Offre gratuite.
- **Hébergement** : hébergement statique gratuit *(au constructeur : Cloudflare Pages, Netlify ou GitHub Pages)*.
- **Vidéos** : liens YouTube non répertoriés intégrés (lecteur `youtube-nocookie.com`), et liens vers les vidéos FIVB Academy déjà présentes dans le Casebook.
- **Polices** : Sofia Sans et Sofia Sans Condensed, auto-hébergées (pas d'appel à Google Fonts en production).
- **Hors ligne en examen** : les réponses non envoyées sont gardées dans le navigateur et renvoyées au retour de la connexion (états maquettés à l'écran 2).
- **Attention à l'offre gratuite Supabase** : un projet inactif pendant 7 jours est mis en pause. Prévoir soit une tâche planifiée gratuite qui le sollicite, soit l'acceptation d'une réactivation manuelle hors saison.

## 11. Design

Tout écran suit [DESIGN.md](../../../DESIGN.md) : bandeau-tableau anthracite avec volets à chiffres, filet pointillé entre situation et décision, bleu = acquis / juste, rouge = à revoir / faux, ambre = en attente, bordures et jamais d'ombres, Sofia Sans / Sofia Sans Condensed. Les maquettes du canevas sont la référence de composition ; les écrans 6 à 12 réutilisent les mêmes composants. Toute valeur hors système est ajoutée à DESIGN.md avant usage.

## 12. Livraison par versions *(choix de conception, à valider)*

- **V1 — S'entraîner** : comptes (créés par les formateurs), règles FIVB et Casebook importés et consultables, bibliothèque de questions avec relecture et validation, mode pédagogique, examen d'entraînement, accueil stagiaire.
- **V2 — Évaluer** : réserve d'examen, examens officiels (création, inscription, code d'accès, passation en salle, résultats), fiche stagiaire formateur (examens officiels et avancement pédagogique), consignes CFA.
- **En continu dès le départ** : l'import du Casebook et la relecture des brouillons par les formateurs (c'est le contenu qui rend la plateforme utile).

## 13. Décisions ouvertes (à trancher par le porteur du projet ou le comité)

1. **Nom de la plateforme** (les maquettes utilisent « Arbitrage volley »).
2. **Liste des niveaux** et **liste des thèmes** (proposition : les rubriques du Casebook comme thèmes de départ).
3. **Seuil de réussite** des examens officiels (par examen, ou commun ?).
4. **Consignes CFA** : document à fournir.
5. **Qui relit les brouillons importés** et à quel rythme (208 cas → environ 200 questions à valider). Le comité doit aussi accepter le principe de brouillons rédigés avec l'aide d'une IA puis validés par un formateur.
6. **Banque de QCM existante** : les QCM de niveaux utilisés aujourd'hui sont-ils à importer (ce serait un deuxième import, et une bonne source pour la réserve d'examen) ?
7. **Durée de conservation** des données (proposition : 2 ans après désactivation du compte).
8. **Comptes techniques** : qui, au comité, détient les comptes Supabase, hébergeur, service d'e-mail et dépôt de code, pour les transmettre d'un bénévole à l'autre.

## 14. Laissé au constructeur

Choix précis du framework front et de l'hébergeur statique, structure du code, outils de test, détails des scripts d'import, stratégie de copie figée des questions d'examen (copie ou versionnement), mise en page des écrans 6 à 12 dans le respect de DESIGN.md.
