# V1 « S'entraîner » — plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** livrer la V1 de la plateforme de formation des arbitres : comptes créés par les formateurs, règles FIVB et Casebook importés et consultables, bibliothèque de questions avec relecture et validation, mode pédagogique, examen d'entraînement, accueil stagiaire.

**Architecture :** une application monopage SvelteKit compilée en site statique (adapter-static, mode SPA) parle directement à Supabase (Auth, PostgreSQL, RLS). Toute règle qui protège une réponse juste ou une donnée privée vit dans la base (RLS + fonctions SQL `security definer`), jamais dans le navigateur. Le contenu (règles, cas, brouillons de questions) est produit par des scripts d'import en fichiers JSON versionnés, puis chargé en base par un chargeur idempotent.

**Tech Stack :** Node 24, TypeScript 5, SvelteKit 2 + Svelte 5 + `@sveltejs/adapter-static`, Vitest + `@testing-library/svelte`, `@supabase/supabase-js` 2, Supabase CLI (migrations, Edge Functions Deno), `tsx` pour les scripts, `pdftotext` (poppler, déjà installé), polices `@fontsource/sofia-sans` et `@fontsource/sofia-sans-condensed`.

**Spec :** [docs/superpowers/specs/2026-10-17-plateforme-formation-arbitres-design.md](../specs/2026-10-17-plateforme-formation-arbitres-design.md). Design : [DESIGN.md](../../../DESIGN.md), maquettes https://claude.ai/artifact/H6CPLUXi29jfN8ujF6MiPZ.

**Hors de ce plan (plan V2 séparé) :** réserve d'examen (sauf la colonne `usage`), examens officiels, code d'accès, fiche stagiaire formateur, consignes CFA.

## Global Constraints

- Interface, contenus, messages d'erreur et libellés en **français**, capitales de phrase, verbes sur les boutons (DESIGN.md › Voix).
- Toute valeur visuelle vient de `src/lib/styles/tokens.css`, généré à la main depuis DESIGN.md ; une valeur absente de DESIGN.md est d'abord ajoutée à DESIGN.md.
- Polices auto-hébergées (paquets `@fontsource`), **aucun appel à fonts.googleapis.com** en production.
- Aucune correction affichée sans sa source ; aucune question `brouillon` visible d'un stagiaire.
- Un stagiaire ne lit jamais la bonne réponse avant d'avoir enregistré la sienne ; jamais pendant un examen d'entraînement.
- Les formateurs ne lisent jamais les séances `examen_entrainement` ni leurs réponses.
- Un stagiaire ne lit jamais une question d'usage `reserve_examen`.
- Projet Supabase en région UE ; clé `service_role` uniquement dans les scripts locaux (`.env.local`, ignoré par Git) et les Edge Functions, jamais dans le front.
- Pas d'IA appelée par la plateforme en fonctionnement.
- Accessibilité AA : contraste, clavier, `prefers-reduced-motion` respecté (animation des volets coupée).
- **Pas de Docker sur la machine** : les tests de base de données tournent contre un projet Supabase **de développement** hébergé (offre gratuite, 2 projets autorisés), distinct du projet de production. Les tests d'intégration lisent `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY` et `SUPABASE_TEST_SERVICE_KEY` dans `.env.local` et sont regroupés sous `tests/integration/` (commande `npm run test:integration`).

## Review Focus

1. **Double validation** (double clic sur « Valider ma réponse », renvoi après coupure) : la première réponse enregistrée fait foi, la seconde renvoie le même résultat sans créer de doublon → test dans la tâche 8.
2. **Stagiaire qui interroge l'API directement** pour lire les bonnes réponses ou les brouillons → tests RLS dans la tâche 7.
3. **Coupure réseau pendant un examen d'entraînement** : les réponses sont gardées dans le navigateur et renvoyées dans l'ordre au retour, sans doublon → test dans la tâche 15.
4. **Bruit de mise en page du PDF** (numéros de page, « PARTIE 2 - SECTION 1 », renvois de la colonne de droite mêlés au texte) dans le texte d'une règle → test dans la tâche 2.
5. **Références introuvables** : un cas cite une règle absente de l'import ou une figure (« Fig.1b ») → le validateur la signale sans planter, le chargeur ne crée pas de lien cassé → tests dans les tâches 4 et 9.

---

## Structure des fichiers

```
package.json, svelte.config.js, vite.config.ts, tsconfig.json, .env.example, .gitignore
src/
  app.html
  lib/
    styles/tokens.css, base.css
    domain/types.ts            types partagés front / scripts
    supabase.ts                client navigateur
    auth.ts                    session, profil, garde de rôle
    data/regles.ts, seances.ts, questions.ts, stagiaires.ts
    seance/pedagogique.ts      état d'une séance pédagogique (pur)
    seance/examen.ts           état d'un examen d'entraînement (pur)
    seance/file-hors-ligne.ts  file de réponses non envoyées
    regles/arbre.ts            arborescence et recherche (pur)
    formateur/validation-question.ts
    components/Bandeau.svelte, Volet.svelte, Compteur.svelte, Filet.svelte,
               Reponse.svelte, PanneauDecision.svelte, SourcesOnglets.svelte,
               SchemaTerrain.svelte (réservé, non utilisé en V1),
               GrilleQuestions.svelte, DialogueConfirmation.svelte, Etiquette.svelte
  routes/
    +layout.svelte, +layout.ts (ssr=false, prerender=false)
    connexion/, mot-de-passe/, notice/
    +page.svelte (accueil stagiaire)
    regles/, regles/[edition]/[reference]/
    entrainement/nouvelle/, entrainement/[seance]/
    examen-entrainement/[seance]/, examen-entrainement/[seance]/resultat/
    formateur/questions/, formateur/questions/[id]/, formateur/stagiaires/
scripts/import/
  regles/parse-regles.ts, casebook/parse-casebook.ts,
  brouillons/valider-brouillons.ts, charger.ts
data/
  regles-2025-2028.json, casebook-2025.json, brouillons-casebook-2025.json
supabase/
  migrations/0001_schema.sql, 0002_rls.sql, 0003_fonctions.sql
  seed/referentiel.sql
  functions/creer-compte/index.ts
tests/
  unit/…  (Vitest, sans réseau)
  integration/…  (Vitest, projet Supabase de dev)
  fixtures/regles-extrait.txt, casebook-extrait.md
README.md  (guide pour les bénévoles)
```

---

### Task 1 : socle de l'application et design tokens

**Files :**
- Create : `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `.env.example`, `src/app.html`, `src/routes/+layout.ts`, `src/routes/+layout.svelte`, `src/lib/styles/tokens.css`, `src/lib/styles/base.css`
- Test : `tests/unit/tokens.test.ts`

**Interfaces :**
- Produces : variables CSS `--tableau`, `--volet`, `--sol`, `--papier`, `--encre`, `--doux`, `--filet`, `--bleu`, `--bleu-clair`, `--rouge`, `--rouge-clair`, `--ambre`, `--ambre-vif`, `--ambre-clair`, `--tableau-survol`, `--tableau-texte`, `--tableau-texte-doux`, `--volet-bord`, `--bleu-texte`, `--rouge-texte`, `--desactive`, `--filet-doux`, `--ligne-survol`, `--terrain`, `--zone-surlignee`, plus `--police` (Sofia Sans) et `--police-chiffres` (Sofia Sans Condensed), rayons `--r-petit: 4px`, `--r: 6px`. Scripts npm : `dev`, `build`, `test` (unitaires), `test:integration`, `check`.

- [ ] **Step 1 : initialiser le projet** avec `npx sv create` (modèle minimal, TypeScript, Vitest), ajouter `@sveltejs/adapter-static` configuré avec `fallback: 'index.html'`, `+layout.ts` exportant `ssr = false` et `prerender = false`. `.gitignore` inclut `.env.local`, `build/`, `.svelte-kit/`.
- [ ] **Step 2 : écrire le test qui empêche la dérive** `tests/unit/tokens.test.ts` :

```ts
test('chaque couleur de DESIGN.md existe dans tokens.css avec la même valeur', () => {
  const design = readFileSync('DESIGN.md', 'utf8');
  const tokens = readFileSync('src/lib/styles/tokens.css', 'utf8');
  const attendus = [...design.matchAll(/`(--[a-z-]+)` (#[0-9A-F]{6})/g)];
  expect(attendus.length).toBeGreaterThanOrEqual(25);
  for (const [, nom, hex] of attendus) expect(tokens).toMatch(new RegExp(`${nom}:\\s*${hex}`, 'i'));
});
```
(Les lignes de DESIGN.md au format `` `--a` #X / `--b` #Y `` doivent toutes être capturées : la regex est appliquée à chaque paire.)

- [ ] **Step 3 : lancer** `npm test -- tokens` → FAIL (fichier absent).
- [ ] **Step 4 : écrire `tokens.css` et `base.css`** : tokens ci-dessus ; `base.css` importe les polices `@fontsource/sofia-sans/{400,500,600,700}.css` et `@fontsource/sofia-sans-condensed/{600,800}.css`, fond `--sol`, couleur `--encre`, `::selection`, `:focus-visible` (2px `--bleu`, décalage 2px), `font-variant-numeric: tabular-nums` sur `.chiffres`.
- [ ] **Step 5 : lancer** `npm test -- tokens` → PASS ; `npm run build` → dossier `build/` contenant `index.html`.
- [ ] **Step 6 : commit** `feat: socle SvelteKit statique et design tokens`.

### Task 2 : extraction des règles FIVB

**Files :**
- Create : `scripts/import/regles/parse-regles.ts`, `src/lib/domain/types.ts`, `data/regles-2025-2028.json`
- Test : `tests/unit/parse-regles.test.ts`, fixture `tests/fixtures/regles-extrait.txt` (copie UTF-8 des lignes du PDF autour de 12.4.4, 15.2.1 et 19.3.1.4, avec un saut de page « 42 / PARTIE 2 - SECTION 1: LE JEU » au milieu)

**Interfaces :**
- Produces (dans `types.ts`) :
  `type RegleImport = { reference: string; parent_reference: string | null; titre: string | null; texte: string; renvois: string[]; ordre: number }`
  `parseRegles(texte: string): RegleImport[]` (export de `parse-regles.ts`) ; CLI `npx tsx scripts/import/regles/parse-regles.ts <pdf> <sortie.json>` (lance `pdftotext -layout -enc UTF-8`).

- [ ] **Step 1 : tests**

```ts
const r = parseRegles(fixture);
const r19 = r.find(x => x.reference === '19.3.1.4')!;
expect(r19.parent_reference).toBe('19.3.1');
expect(r19.texte).toMatch(/^Un joueur ne peut effectuer une frappe d'attaque quand le ballon est complètement plus haut/);
expect(r19.texte).toMatch(/en dehors de sa zone avant\.$/);
expect(r19.texte).not.toMatch(/PARTIE 2|^\s*42\s*$|1\.4\.1|Fig\./m);
expect(r19.renvois).toEqual(['1.4.1', '13.3.6', '23.3.2.3d', '23.3.2.3e', 'Fig.1b']);
expect(r.find(x => x.reference === '12.4.4')!.texte).toBe("Le joueur au service doit frapper le ballon au cours des 8 secondes qui suivent le coup de sifflet du premier arbitre.");
expect(r.find(x => x.reference === '15.2')!.titre).toBe('SÉQUENCE D\'INTERRUPTION DE JEU RÈGLEMENTAIRE');
expect(new Set(r.map(x => x.reference)).size).toBe(r.length); // pas de doublon
```
- [ ] **Step 2 : lancer** → FAIL.
- [ ] **Step 3 : implémenter `parseRegles`** : ignorer la table des matières (lignes avec points de conduite `.....`), les lignes de pied et d'en-tête de page ; un article commence par un numéro `\d+(\.\d+)*` en début de ligne (après indentation) ; la colonne de renvois est la portion de ligne au-delà de la colonne 75 environ, reconnue par le motif `^(\d+(\.\d+)*[a-z]?|Fig\.\s?\d+[a-z]?( \(\d+\))?)(,\s*…)*,?$` ; « 23.3.2.3d, e » se développe en `23.3.2.3d` et `23.3.2.3e`. Le parent est la référence privée de son dernier segment.
- [ ] **Step 4 : lancer** → PASS.
- [ ] **Step 5 : générer** `data/regles-2025-2028.json` depuis `docs/FIVB-Volleyball_Rules2025_2028-FR-v04.pdf` ; vérifier à la main 15 articles tirés au hasard contre le PDF et corriger le parseur pour chaque écart (ajouter le cas à la fixture et au test). Résultat attendu : toutes les règles 1 à 29 présentes.
- [ ] **Step 6 : commit** `feat(import): extraction des règles FIVB 2025-2028`.

### Task 3 : extraction des cas du Casebook

**Files :**
- Create : `scripts/import/casebook/parse-casebook.ts`, `data/casebook-2025.json`
- Test : `tests/unit/parse-casebook.test.ts` (lit le vrai `docs/casebook-2025-fr.md`)

**Interfaces :**
- Produces : `type CasImport = { reference: string; chapitre: string; rubrique: string | null; mention_2025: 'nouveau' | 'modifie' | null; video_url: string | null; situation: string; decision: string; regles_citees: string[]; texte_original: string; ordre: number }` dans `types.ts` ; `parseCasebook(md: string): CasImport[]`.

- [ ] **Step 1 : tests**

```ts
const cas = parseCasebook(readFileSync('docs/casebook-2025-fr.md', 'utf8'));
expect(cas).toHaveLength(208);
const c = cas.find(x => x.reference === 'Cas 3.35.1')!;
expect(c).toMatchObject({ chapitre: 'Actions de jeu', rubrique: 'Frappe d\'attaque', mention_2025: 'nouveau', regles_citees: ['13.3.6', '19.3.1.4'] });
expect(c.video_url).toMatch(/^http:\/\/www\.fivbacademy\.com\/.+\.mp4$/);
expect(c.situation).toMatch(/^Le Libéro, dans la zone avant/);
expect(c.decision).toMatch(/^Oui, car il s'agissait d'une attaque fautive/);
expect(c.texte_original).toMatch(/^\*\*3\.35\.1\*\* The Libero/);
expect(cas.find(x => x.reference === 'Cas 1.1')!.regles_citees).toEqual(['4.5.1', '4.5.3']);
expect(cas.find(x => x.reference === 'Cas 1.1')!.rubrique).toBe('Objets interdits');
expect(cas.filter(x => x.chapitre === 'Le Libéro' && x.rubrique === null).length).toBeGreaterThan(0);
```
(La rubrique de 3.35.1 est celle du `###` qui précède le cas dans le fichier ; vérifier son libellé exact dans le fichier et l'utiliser dans le test.)
- [ ] **Step 2 : lancer** → FAIL.
- [ ] **Step 3 : implémenter** en parcourant les titres `## Chapitre N — X`, `### Y`, `#### Cas R` (mention après `·`) ; s'arrêter à `## Annexe`. Une décision peut tenir sur plusieurs paragraphes : tout jusqu'à la ligne `*Règle(s) …*`.
- [ ] **Step 4 : lancer** → PASS ; générer `data/casebook-2025.json`.
- [ ] **Step 5 : commit** `feat(import): extraction des 208 cas du Casebook 2025`.

### Task 4 : format et validateur des brouillons de questions

**Files :**
- Create : `scripts/import/brouillons/valider-brouillons.ts`
- Test : `tests/unit/valider-brouillons.test.ts`

**Interfaces :**
- Consumes : `RegleImport`, `CasImport`.
- Produces :
  `type Lettre = 'A' | 'B' | 'C' | 'D'`
  `type BrouillonQuestion = { cas: string; enonce: string; propositions: { lettre: Lettre; texte: string; correcte: boolean }[]; explication: string; theme: string; niveau: string; role_cible: 'arbitre' | 'marqueur' | 'les_deux'; regles: string[]; regle_principale: string }`
  `type CasSansQuestion = { cas: string; sans_question: true; raison: string }`
  `type Probleme = { cas: string; gravite: 'erreur' | 'avertissement'; message: string }`
  `validerBrouillons(entrees: (BrouillonQuestion | CasSansQuestion)[], cas: CasImport[], regles: RegleImport[]): Probleme[]` ; CLI qui imprime les problèmes et sort en code 1 s'il y a une erreur.

- [ ] **Step 1 : tests** (un test par règle) : erreur si propositions ≠ 4 lettres A–D distinctes ; erreur si nombre de `correcte` ≠ 1 ; erreur si `cas` inconnu ; erreur si un cas apparaît deux fois ; erreur si `regle_principale` ∉ `regles` ; erreur si énoncé ou explication vides ; **avertissement** (pas erreur) si une référence de `regles` est une figure (`/^Fig\./`) ou absente de l'import des règles ; avertissement listant les cas du Casebook ni traités ni marqués `sans_question` ; une entrée correcte ne produit aucun problème.
- [ ] **Step 2 : lancer** → FAIL. **Step 3 : implémenter.** **Step 4 : lancer** → PASS.
- [ ] **Step 5 : commit** `feat(import): validateur des brouillons de questions`.

### Task 5 : rédaction des brouillons à partir du Casebook (contenu)

**Files :**
- Create : `data/brouillons-casebook-2025.json`

Tâche de contenu, faite par l'agent avec le Casebook sous les yeux, chapitre par chapitre (9 lots, un commit par lot).

- [ ] **Step 1 : pour chaque cas du chapitre**, écrire soit un `BrouillonQuestion`, soit un `CasSansQuestion` (raison : question ouverte, plusieurs décisions successives, réponse non binaire). Règles de rédaction, issues du spec § 9.2 :
  - énoncé = la situation, au présent, terminée par « Quelle est votre décision ? » (ou la question du cas si elle est déjà fermée) ;
  - bonne réponse = la décision en une phrase ; **trois mauvaises réponses plausibles**, de même longueur et même forme que la bonne, chacune correspondant à une erreur réelle de stagiaire (mauvais fautif, mauvaise sanction, mauvaise règle) ; position de la bonne réponse répartie entre A et D ;
  - explication = la décision du Casebook reformulée, sans ajouter d'interprétation ;
  - `regles` = règles citées + la référence du cas (`Cas 3.35.1`), `regle_principale` = la première règle citée ;
  - `theme` = la rubrique (ou le chapitre si pas de rubrique) ; `niveau` = « Niveau 1 » (règle de base), « Niveau 2 » (application courante) ou « Niveau 3 » (cas rare ou technologie) ; `role_cible` = `marqueur` pour les cas de feuille de match, remplacements comptés, temps-morts comptés ; `les_deux` si les deux rôles doivent le savoir ; sinon `arbitre`.
- [ ] **Step 2 : lancer** `npx tsx scripts/import/brouillons/valider-brouillons.ts` → 0 erreur pour le lot.
- [ ] **Step 3 : commit** `content: brouillons Casebook chapitre N`. Répéter pour les 9 chapitres ; à la fin, l'avertissement « cas non traités » doit être vide.

### Task 6 : schéma de la base

**Files :**
- Create : `supabase/config.toml` (via `npx supabase init`), `supabase/migrations/0001_schema.sql`, `supabase/seed/referentiel.sql`
- Test : `tests/integration/schema.test.ts`

**Interfaces :**
- Produces : les tables du spec § 6 nécessaires en V1, avec ces écarts décidés ici :
  - `propositions(id, question_id, lettre, texte)` **sans** colonne `correcte` ; la bonne réponse est dans `bonnes_reponses(question_id primary key, proposition_id)` (lisible des seuls formateurs) ;
  - `seance_questions(seance_id, question_id, ordre)` pour figer le tirage d'une séance ;
  - `reponses(seance_id, question_id, proposition_id, correcte, signalee, repondu_le)`, **unique (seance_id, question_id)** ;
  - `profils` avec `mineur_parents_informes boolean`, `notice_acceptee_le timestamptz` ;
  - `questions.usage` (`entrainement` | `reserve_examen`, défaut `entrainement`) et `questions.a_relire` déjà présents pour la V2.
  - Énumérations en `check` sur `text` (lisible pour des bénévoles) plutôt qu'en types `enum`.
- `referentiel.sql` : éditions « Règles officielles 2025-2028 » et « Casebook 2025 » (actives) ; niveaux provisoires « Niveau 1 », « Niveau 2 », « Niveau 3 » ; thèmes = rubriques et chapitres sans rubrique du Casebook, dans l'ordre du fichier.

- [ ] **Step 1 : prérequis humain** : créer le projet Supabase de **développement** (région UE), copier `.env.example` en `.env.local` et y mettre les trois variables `SUPABASE_TEST_*` ; `npx supabase link`.
- [ ] **Step 2 : test** : avec la clé service, insérer une question, deux propositions, une bonne réponse ; vérifier qu'un second `insert` dans `reponses` avec la même paire `(seance_id, question_id)` échoue (code `23505`) et qu'une question avec `statut = 'publiee'` est refusée (code `23514`).
- [ ] **Step 3 : lancer** `npm run test:integration -- schema` → FAIL. **Step 4 : écrire la migration et le seed**, `npx supabase db push`, exécuter le seed. **Step 5 : lancer** → PASS.
- [ ] **Step 6 : commit** `feat(db): schéma V1`.

### Task 7 : règles d'accès (RLS)

**Files :**
- Create : `supabase/migrations/0002_rls.sql`, `tests/integration/aide-comptes.ts` (crée via la clé service un formateur et deux stagiaires de test, renvoie trois clients connectés), `tests/integration/rls.test.ts`

**Interfaces :**
- Consumes : schéma tâche 6.
- Produces : fonction SQL `est_formateur() returns boolean` (lit `profils.role` de `auth.uid()`, `security definer`, `stable`) ; `creerComptesDeTest(): Promise<{ formateur: SupabaseClient; stagiaireA: SupabaseClient; stagiaireB: SupabaseClient; ids: {...} }>`.

- [ ] **Step 1 : tests**, chacun en une assertion :
  - stagiaire : `select` sur `questions` ne renvoie que `statut = 'validee'` et `usage = 'entrainement'` (en semer une de chaque autre sorte) ;
  - stagiaire : `select` sur `bonnes_reponses` → 0 ligne ;
  - stagiaire : `insert` direct dans `reponses` → refusé (les réponses passent par la fonction de la tâche 8) ;
  - stagiaire A ne voit ni les séances ni les réponses de B ;
  - formateur : voit les séances `pedagogique` de A, **ne voit pas** ses séances `examen_entrainement` ni les réponses associées ;
  - formateur : peut insérer, modifier et valider une question ; stagiaire : ne peut pas ;
  - stagiaire : ne peut pas modifier son propre `profils.role`.
- [ ] **Step 2 : lancer** → FAIL. **Step 3 : écrire les politiques.** **Step 4 : lancer** → PASS.
- [ ] **Step 5 : commit** `feat(db): règles d'accès`.

### Task 8 : fonctions de séance

**Files :**
- Create : `supabase/migrations/0003_fonctions.sql`, `tests/integration/seances.test.ts`

**Interfaces :**
- Produces (fonctions `security definer`, appelées via `supabase.rpc`) :
  - `creer_seance(p_type text, p_theme_ids uuid[], p_niveau_id uuid, p_role text, p_nb int, p_duree_minutes int) returns uuid` — tire au hasard `p_nb` questions validées d'usage `entrainement` correspondant aux filtres (filtres `null` = tous) ; erreur `P0001` « Aucune question ne correspond à ces critères. » si 0.
  - `questions_de_seance(p_seance uuid) returns table(ordre int, question_id uuid, enonce text, theme text, niveau text, role_cible text, video_url text, propositions jsonb, deja_repondue boolean)` — `propositions` = `[{id, lettre, texte}]`, jamais la bonne réponse.
  - `valider_reponse(p_seance uuid, p_question uuid, p_proposition uuid, p_repondu_le timestamptz default now()) returns jsonb` — séance `pedagogique` : `{correcte, bonne_proposition_id, explication, sources: [{source, edition, reference, texte, texte_original, principale}]}` ; séance `examen_entrainement` : `{enregistree: true}`. Première réponse définitive en pédagogique ; en examen, la réponse est remplaçable jusqu'à la fin. Refus (`P0001` « Le temps de l'examen est écoulé. ») si `p_repondu_le > debut + duree` ou si la séance est terminée.
  - `signaler_question(p_seance uuid, p_question uuid, p_signalee boolean) returns void`.
  - `terminer_seance(p_seance uuid) returns jsonb` — `{score, total, par_theme: [{theme, justes, total}]}`, pose `fin` ; idempotente.
  - `avancement(p_stagiaire uuid default auth.uid()) returns table(theme_id uuid, theme text, total int, acquises int, a_revoir int)` — séances pédagogiques uniquement ; formateur : n'importe quel stagiaire ; stagiaire : lui seul.
  - Toutes vérifient que la séance appartient à `auth.uid()`.

- [ ] **Step 1 : tests** : réponse fausse en pédagogique → `correcte: false` et `bonne_proposition_id` exact, `sources[0].reference` = règle principale ; **double appel** identique → même résultat, une seule ligne dans `reponses` ; second appel avec une autre proposition en pédagogique → résultat de la première ; en examen → `{enregistree: true}` et **aucune** clé `correcte` ; réponse avec `p_repondu_le` après la durée → erreur « Le temps de l'examen est écoulé. » ; `terminer_seance` deux fois → même score ; stagiaire B appelant `valider_reponse` sur la séance de A → erreur ; `avancement` : acquise = dernière réponse juste, à revoir = dernière fausse ; formateur appelant `avancement(A)` → lignes ; stagiaire B appelant `avancement(A)` → erreur.
- [ ] **Step 2 : lancer** → FAIL. **Step 3 : implémenter.** **Step 4 : lancer** → PASS.
- [ ] **Step 5 : commit** `feat(db): fonctions de séance`.

### Task 9 : chargement du contenu en base

**Files :**
- Create : `scripts/import/charger.ts`
- Test : `tests/integration/charger.test.ts`

**Interfaces :**
- Consumes : JSON des tâches 2, 3, 5 ; types `RegleImport`, `CasImport`, `BrouillonQuestion`.
- Produces : `charger(client: SupabaseClient, fichiers: { regles: RegleImport[]; cas: CasImport[]; brouillons: (BrouillonQuestion | CasSansQuestion)[] }): Promise<{ regles: number; cas: number; questions: number; liensIgnores: string[] }>` ; CLI `npx tsx scripts/import/charger.ts` (clé service de `.env.local`, cible choisie par `--cible dev|prod`).

- [ ] **Step 1 : tests** sur un mini-jeu (3 règles, 2 cas, 2 brouillons dont un citant `Fig.1b` et une règle absente) : comptes renvoyés exacts ; les questions sont en `brouillon`, `origine = 'casebook'`, `origine_regle_id` = le cas ; `liensIgnores` contient `Fig.1b` et la règle absente ; **second lancement** → mêmes comptes en base (upsert sur `(edition_id, reference)` pour les règles, sur `origine_regle_id` pour les questions) et **une question déjà validée n'est pas écrasée** ; chargement d'une **nouvelle édition** d'une source (`--edition "Casebook 2026"`) → l'ancienne édition passe `active = false` et chaque question validée liée à une de ses règles reçoit `a_relire = true` (spec § 6, changement d'édition).
- [ ] **Step 2 : lancer** → FAIL. **Step 3 : implémenter.** **Step 4 : lancer** → PASS.
- [ ] **Step 5 : charger** le contenu réel dans le projet de dev ; contrôler dans Supabase : ~200 questions `brouillon`, 208 cas, règles 1 à 29.
- [ ] **Step 6 : commit** `feat(import): chargeur idempotent`.

### Task 10 : création des comptes

**Files :**
- Create : `supabase/functions/creer-compte/index.ts`, `tests/integration/creer-compte.test.ts`

**Interfaces :**
- Produces : `POST /functions/v1/creer-compte` corps `{ email: string; prenom: string; nom: string; role: 'stagiaire' | 'formateur'; profil_formation: 'arbitre' | 'marqueur'; niveau_id: string; mineur_parents_informes: boolean }` → `201 { id }` ; `403` si l'appelant n'est pas formateur ; `409 { message: "Un compte existe déjà avec cette adresse." }` ; `422` si `mineur_parents_informes` est absent. Utilise `auth.admin.inviteUserByEmail` puis insère le profil.

- [ ] **Step 1 : tests** : stagiaire → 403 ; formateur → 201 et profil créé avec les bons champs ; même e-mail deux fois → 409.
- [ ] **Step 2 : lancer** → FAIL. **Step 3 : implémenter**, `npx supabase functions deploy creer-compte`. **Step 4 : lancer** → PASS.
- [ ] **Step 5 : configurer le SMTP externe** (Brevo ou Resend, offre gratuite) dans Supabase › Auth › SMTP, et traduire en français les modèles d'e-mails d'invitation et de réinitialisation ; noter la procédure dans `README.md`.
- [ ] **Step 6 : commit** `feat: création des comptes par les formateurs`.

### Task 11 : connexion, notice et coquille de l'application

**Files :**
- Create : `src/lib/supabase.ts`, `src/lib/auth.ts`, `src/routes/connexion/+page.svelte`, `src/routes/mot-de-passe/+page.svelte`, `src/routes/notice/+page.svelte`, `src/lib/components/Bandeau.svelte`, `Volet.svelte`, `Compteur.svelte`, `Filet.svelte`, `Etiquette.svelte` ; modifier `src/routes/+layout.svelte`
- Test : `tests/unit/volet.test.ts`, `tests/unit/garde.test.ts`

**Interfaces :**
- Produces :
  - `Volet.svelte` props `{ chiffre: string; tourne?: boolean; total?: boolean }` ; `Compteur.svelte` props `{ valeur: number; chiffres: number; libelle: string; couleur?: 'bleu' | 'rouge' | null }` (affiche les volets, `aria-hidden`, et un libellé texte) ; `Bandeau.svelte` props `{ titre: string; sousTitre: string; compteurs: { valeur; chiffres; libelle; couleur? }[]; resumeTexte: string }` + slot `navigation` (passe en ligne texte sous 600px comme dans les maquettes) ; `Filet.svelte` sans props.
  - `garde(profil: Profil | null, chemin: string): string | null` dans `auth.ts` — renvoie l'URL de redirection : `/connexion` sans session ; `/notice` si `notice_acceptee_le` est vide ; `/` si un stagiaire vise `/formateur/*` ; `null` sinon.
  - `type Profil = { id: string; prenom: string; nom: string; role: 'stagiaire' | 'formateur'; profil_formation: 'arbitre' | 'marqueur'; niveau_id: string; notice_acceptee_le: string | null }`.

- [ ] **Step 1 : tests** : `Compteur` avec `valeur: 7, chiffres: 2` rend deux volets « 0 » et « 7 » ; quand `valeur` passe de 5 à 6, seul le second volet reçoit la classe de rotation ; avec `matchMedia('(prefers-reduced-motion: reduce)')` à vrai, aucune classe de rotation ; table de vérité de `garde` (4 cas ci-dessus + formateur sur `/formateur/questions` → `null`).
- [ ] **Step 2 : lancer** → FAIL. **Step 3 : implémenter** en reprenant le balisage et les styles des maquettes 1 et 4 (bandeau, volets, navigation) avec les tokens ; la page de connexion propose « Mot de passe oublié ? » ; la notice reprend le spec § 7 bis et se valide par « J'ai lu cette notice ». **Step 4 : lancer** → PASS.
- [ ] **Step 5 : commit** `feat: connexion, notice et bandeau-tableau`.

### Task 12 : consultation des règles

**Files :**
- Create : `src/lib/regles/arbre.ts`, `src/lib/data/regles.ts`, `src/routes/regles/+page.svelte`, `src/routes/regles/[edition]/[reference]/+page.svelte`
- Test : `tests/unit/arbre.test.ts`

**Interfaces :**
- Produces : `type Regle = { id: string; edition: string; source: 'fivb_regles' | 'casebook' | 'cfa'; reference: string; parent_reference: string | null; titre: string | null; texte: string; texte_original: string | null; renvois: string[]; video_url: string | null }` ; `construireArbre(regles: Regle[]): NoeudRegle[]` avec `NoeudRegle = { regle: Regle; enfants: NoeudRegle[] }`, tri numérique (`19.10` après `19.9`) ; `chercher(regles: Regle[], requete: string): Regle[]` — une requête de la forme `\d+(\.\d+)*` ou « Cas 3.35 » cherche par préfixe de référence, sinon par mots dans le texte, sans tenir compte des accents ni de la casse. URL d'une règle : `/regles/{edition-slug}/{reference}`.

- [ ] **Step 1 : tests** : avec les références `['19', '19.9', '19.10', '19.3', '19.3.1.4']` (sans `19.3.1`), les enfants de `19` sont dans l'ordre `19.3`, `19.9`, `19.10`, et `19.3.1.4` est rattaché à `19.3` (un article dont le parent n'est pas importé se rattache à son plus proche ancêtre existant) ; `chercher(r, '19.3')` renvoie `19.3` et `19.3.1.4` mais pas `19.10` ; `chercher(r, 'libero')` trouve les textes contenant « Libéro » ; `chercher(r, 'Cas 3.35')` trouve `Cas 3.35` et `Cas 3.35.1`.
- [ ] **Step 2 : lancer** → FAIL. **Step 3 : implémenter** ; la fiche d'une règle affiche texte, renvois cliquables, vidéo FIVB si présente, la mention « Traduction française non officielle — le texte anglais fait foi » et le texte anglais dépliable pour un cas du Casebook, et un bouton « S'entraîner sur cette règle ». **Step 4 : lancer** → PASS.
- [ ] **Step 5 : commit** `feat: consultation des règles`.

### Task 13 : lancer une séance

**Files :**
- Create : `src/lib/data/seances.ts`, `src/routes/entrainement/nouvelle/+page.svelte`
- Test : `tests/unit/seances-params.test.ts`

**Interfaces :**
- Consumes : `creer_seance` (tâche 8).
- Produces : `type ParametresSeance = { type: 'pedagogique' | 'examen_entrainement'; themeIds: string[]; niveauId: string | null; role: 'arbitre' | 'marqueur' | null; nb: number; dureeMinutes: number | null }` ; `parametresParDefaut(profil: Profil, type): ParametresSeance` (pédagogique : 20 questions, sans durée ; examen : 30 questions, 45 minutes ; niveau et rôle du profil) ; `lireParametres(url: URL, profil: Profil): ParametresSeance` (préremplissage depuis `?theme=…&regle=…`) ; `creerSeance(p: ParametresSeance): Promise<string>`.

- [ ] **Step 1 : tests** sur `parametresParDefaut` et `lireParametres` (valeurs ci-dessus, `nb` borné entre 5 et 50).
- [ ] **Step 2 : lancer** → FAIL. **Step 3 : implémenter** la page (choix du mode, thèmes en cases à cocher, niveau, rôle, nombre, durée pour l'examen) ; l'erreur « Aucune question ne correspond à ces critères. » s'affiche sous le formulaire avec un bouton « Élargir aux autres niveaux ». **Step 4 : lancer** → PASS.
- [ ] **Step 5 : commit** `feat: lancement d'une séance`.

### Task 14 : mode pédagogique

**Files :**
- Create : `src/lib/seance/pedagogique.ts`, `src/routes/entrainement/[seance]/+page.svelte`, `src/lib/components/Reponse.svelte`, `PanneauDecision.svelte`, `SourcesOnglets.svelte`
- Test : `tests/unit/pedagogique.test.ts`, `tests/unit/reponse.test.ts`

**Interfaces :**
- Consumes : `questions_de_seance`, `valider_reponse`, `terminer_seance` (tâche 8) ; `Bandeau` (tâche 11).
- Produces : machine d'état pure `type EtatPedago = { questions: QuestionSeance[]; index: number; choix: string | null; resultat: ResultatValidation | null; acquises: number; aRevoir: number; envoi: 'repos' | 'en_cours' | 'erreur' }` avec `choisir(e, propositionId)`, `debutValidation(e)`, `finValidation(e, r: ResultatValidation)`, `echecValidation(e)`, `suivante(e)` ; `ResultatValidation` = la réponse JSON pédagogique de `valider_reponse`.

- [ ] **Step 1 : tests** : `choisir` refusé quand `resultat` existe ; `debutValidation` sans `choix` ne change rien ; `finValidation` juste → `acquises + 1` ; fausse → `aRevoir + 1` ; **`debutValidation` pendant `envoi = 'en_cours'` ne change rien** (double clic) ; `echecValidation` → `envoi = 'erreur'` en gardant le choix ; `suivante` sur la dernière question → `index` inchangé et indicateur `terminee: true`. `Reponse.svelte` rend un `input type="radio"` avec son `label`, et les états `ok` / `ko` affichent « Bonne réponse » / « Votre réponse ».
- [ ] **Step 2 : lancer** → FAIL. **Step 3 : implémenter** l'écran selon la maquette 1 (bandeau Question / Acquises / À revoir, filet, panneau Décision avec onglets FIVB / Casebook / CFA — onglet CFA masqué tant qu'aucune source CFA n'est liée — mention de traduction non officielle sous un extrait du Casebook, focus sur le panneau sous 1000px). En cas d'échec réseau : message « Votre réponse n'a pas pu être enregistrée. Vérifiez votre connexion puis réessayez. » et bouton « Réessayer ». En fin de séance : récapitulatif (justes / total) et liens vers les règles des réponses fausses. **Step 4 : lancer** → PASS.
- [ ] **Step 5 : commit** `feat: mode pédagogique`.

### Task 15 : examen d'entraînement

**Files :**
- Create : `src/lib/seance/examen.ts`, `src/lib/seance/file-hors-ligne.ts`, `src/routes/examen-entrainement/[seance]/+page.svelte`, `src/routes/examen-entrainement/[seance]/resultat/+page.svelte`, `src/lib/components/GrilleQuestions.svelte`, `DialogueConfirmation.svelte`
- Test : `tests/unit/examen.test.ts`, `tests/unit/file-hors-ligne.test.ts`

**Interfaces :**
- Consumes : tâche 8 ; `Reponse.svelte` (tâche 14).
- Produces :
  - `type ReponseEnAttente = { seanceId: string; questionId: string; propositionId: string; reponduLe: string }` ; `creerFile(stockage: Storage, cle: string)` → `{ ajouter(r): void; lister(): ReponseEnAttente[]; vider(envoyer: (r) => Promise<void>): Promise<{ envoyees: number; restantes: number }> }` — une seule entrée par `(seanceId, questionId)` (la plus récente gagne), envoi dans l'ordre, arrêt au premier échec.
  - `tempsRestant(debut: Date, dureeMinutes: number, maintenant: Date): { minutes: number; secondes: number; faible: boolean; ecoule: boolean }` (`faible` sous 5 minutes) ; `texteConfirmation(sansReponse: number, signalees: number): { titre: string; texte: string }` avec exactement les textes de la maquette 2 (« Terminer l'examen maintenant ? » / « Terminer et voir votre score ? », « {n} questions sans réponse et {s} signalées à vérifier. Une fois terminé, vous ne pourrez plus modifier vos réponses. ») ; `prochaineSansReponse(repondues: Set<number>, courante: number, total: number): number | null`.

- [ ] **Step 1 : tests** : file — deux ajouts pour la même question → une entrée, la dernière ; `vider` avec un envoi qui échoue à la 2e → `{envoyees: 1, restantes: n-1}` et rien de perdu ; contenu relu après recréation de la file depuis le même `Storage`. Temps — 45 min, 40 min 1 s écoulées → `faible: true` ; 45 min écoulées → `ecoule: true`. `texteConfirmation(19, 2)` et `texteConfirmation(0, 1)` → textes exacts. `prochaineSansReponse` saute les répondues et renvoie `null` quand tout est répondu.
- [ ] **Step 2 : lancer** → FAIL. **Step 3 : implémenter** l'écran selon la maquette 2 (validation → file puis envoi ; bandeau ambre « Hors ligne… » sur l'événement `offline`, vidage de la file sur `online` et au chargement ; à `ecoule`, envoi de la file puis `terminer_seance` automatique) et l'écran de résultat selon la maquette 3 (sans badge Réussi en V1 : pas de seuil pour l'entraînement ; thèmes sous 5/6 → liens « Revoir … en mode pédagogique » vers `/entrainement/nouvelle?theme=…`). **Step 4 : lancer** → PASS.
- [ ] **Step 5 : commit** `feat: examen d'entraînement`.

### Task 16 : accueil stagiaire

**Files :**
- Create : `src/routes/+page.svelte`, ajouts dans `src/lib/data/seances.ts`
- Test : `tests/unit/accueil.test.ts`

**Interfaces :**
- Consumes : `avancement` (tâche 8).
- Produces : `seanceAReprendre(): Promise<{ id: string; type: 'pedagogique'; theme: string; index: number; total: number } | null>` (dernière séance pédagogique sans `fin`) ; `lignesThemes(av: Avancement[]): { theme: string; acquises: number; aRevoir: number; total: number; commence: boolean }[]`.

- [ ] **Step 1 : tests** sur `lignesThemes` : un thème à 0/0 → `commence: false` ; tri dans l'ordre des thèmes.
- [ ] **Step 2 : lancer** → FAIL. **Step 3 : implémenter** selon la maquette 4 (compteurs du bandeau = sommes de `avancement` ; carte « Reprendre » masquée s'il n'y a rien à reprendre et remplacée par « Commencer une séance » ; tableau des thèmes avec « Pas encore commencé » ; bloc convocation à l'état « Aucun examen officiel prévu » en V1 ; règles consultées = 3 dernières fiches visitées, gardées dans `localStorage`). **Step 4 : lancer** → PASS.
- [ ] **Step 5 : commit** `feat: accueil stagiaire`.

### Task 17 : espace formateur — questions et stagiaires

**Files :**
- Create : `src/lib/formateur/validation-question.ts`, `src/lib/data/questions.ts`, `src/lib/data/stagiaires.ts`, `src/routes/formateur/questions/+page.svelte`, `src/routes/formateur/questions/[id]/+page.svelte`, `src/routes/formateur/stagiaires/+page.svelte`
- Test : `tests/unit/validation-question.test.ts`

**Interfaces :**
- Produces : `type FormulaireQuestion = { enonce: string; propositions: { lettre: Lettre; texte: string }[]; bonne: Lettre | null; explication: string; themeId: string | null; niveauId: string | null; roleCible: 'arbitre' | 'marqueur' | 'les_deux'; usage: 'entrainement' | 'reserve_examen'; videoUrl: string; regles: { id: string; principale: boolean }[] }` ; `validerFormulaire(f: FormulaireQuestion): Record<string, string>` (clé = champ, valeur = message) ; `normaliserVideo(url: string): string | null` (accepte `youtube.com/watch?v=`, `youtu.be/`, liens `fivbacademy.com` en `.mp4` ; renvoie l'URL d'intégration `youtube-nocookie.com/embed/…` pour YouTube).

- [ ] **Step 1 : tests** : messages exacts — « Rédigez l'énoncé. », « Remplissez les 4 propositions. », « Choisissez la bonne réponse. », « Rédigez l'explication. », « Choisissez un thème. », « Choisissez un niveau. », « Liez au moins une règle. », « Une seule règle principale. », « Lien vidéo non reconnu (YouTube ou FIVB Academy). » ; `normaliserVideo('https://youtu.be/abc123')` → `https://www.youtube-nocookie.com/embed/abc123`.
- [ ] **Step 2 : lancer** → FAIL. **Step 3 : implémenter** : liste filtrable (statut, thème, niveau, rôle, origine, « à relire ») avec la file « Brouillons à relire » en tête et un compteur ; formulaire d'édition avec recherche de règles (réutilise `chercher` de la tâche 12), aperçu du cas d'origine et de son texte anglais, boutons « Enregistrer » et « Valider la question » (pose `statut = 'validee'`, `valide_par`, `valide_le`), « Archiver » avec confirmation ; page stagiaires : liste, formulaire de création appelant `creer-compte` (case obligatoire « Stagiaire mineur : information des parents faite » ou « Stagiaire majeur »), désactivation (`actif = false`) avec confirmation. **Step 4 : lancer** → PASS.
- [ ] **Step 5 : commit** `feat: espace formateur (questions, stagiaires)`.

### Task 18 : mise en ligne et guide des bénévoles

**Files :**
- Create : `.github/workflows/reveil-supabase.yml`, `README.md` ; modifier `.env.example`

- [ ] **Step 1 : projet Supabase de production** (région UE) : `db push`, seed, déploiement de `creer-compte`, SMTP, chargement du contenu avec `--cible prod` ; créer le premier formateur à la main (SQL dans le README).
- [ ] **Step 2 : hébergement statique** sur Cloudflare Pages (commande `npm run build`, dossier `build`, variables `PUBLIC_SUPABASE_URL` et `PUBLIC_SUPABASE_ANON_KEY`) ; ajouter l'URL du site aux « Redirect URLs » de Supabase Auth.
- [ ] **Step 3 : réveil** : workflow GitHub Actions planifié tous les 3 jours qui appelle une requête `select` légère sur l'API REST de production (évite la mise en pause après 7 jours d'inactivité).
- [ ] **Step 4 : vérifier** de bout en bout, en production : invitation reçue en français → mot de passe → notice → séance pédagogique de 5 questions → examen d'entraînement de 5 questions avec coupure réseau simulée (DevTools › Offline) → résultat ; côté formateur : valider un brouillon, le retrouver dans une séance.
- [ ] **Step 5 : README** pour bénévoles : rôle de chaque dossier, lancer en local, ajouter une question, importer une nouvelle édition du Casebook (tâches 3, 5, 9), où sont les comptes techniques (à compléter par le comité), procédure de suppression des données d'un stagiaire.
- [ ] **Step 6 : commit** `chore: mise en ligne et guide des bénévoles`.
