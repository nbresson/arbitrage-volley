-- Schéma V2 : examens officiels (en salle, une seule tentative) et leurs règles d'accès.
-- Principe : le stagiaire ne lit aucune de ces tables, sauf ses inscriptions et ses tentatives ;
-- tout le reste passe par les fonctions de passation (migration « examens_passation »).
-- Le code d'accès vit dans examen_codes et la bonne réponse figée dans examen_questions,
-- toutes deux illisibles pour les stagiaires.

create table public.examens_officiels (
	id uuid primary key default gen_random_uuid(),
	titre text not null,
	date_heure timestamptz not null,
	lieu text not null default '',
	duree_minutes int not null check (duree_minutes between 1 and 240),
	seuil_reussite int not null check (seuil_reussite >= 1),
	statut text not null default 'brouillon' check (statut in ('brouillon', 'ouvert', 'clos')),
	cree_par uuid default auth.uid() references public.profils (id) on delete set null,
	ouvert_le timestamptz,
	clos_le timestamptz,
	cree_le timestamptz not null default now()
);

create table public.examen_codes (
	examen_id uuid primary key references public.examens_officiels (id) on delete cascade,
	code text not null check (code ~ '^[0-9]{6}$')
);

-- Questions de l'examen. Les colonnes de copie restent vides en brouillon et sont figées à l'ouverture :
-- une modification ultérieure de la question ne change pas un examen ouvert ou passé.
create table public.examen_questions (
	examen_id uuid not null references public.examens_officiels (id) on delete cascade,
	question_id uuid not null references public.questions (id) on delete restrict,
	ordre int not null,
	enonce text,
	theme text,
	propositions jsonb, -- [{lettre, texte}]
	bonne_lettre text check (bonne_lettre in ('A', 'B', 'C', 'D')),
	regles jsonb, -- [{reference, edition, titre, principale}]
	primary key (examen_id, question_id),
	unique (examen_id, ordre)
);

create table public.inscriptions (
	examen_id uuid not null references public.examens_officiels (id) on delete cascade,
	stagiaire_id uuid not null references public.profils (id) on delete cascade,
	inscrit_le timestamptz not null default now(),
	primary key (examen_id, stagiaire_id)
);
create index inscriptions_stagiaire_idx on public.inscriptions (stagiaire_id);

-- Une passation. Une seule par stagiaire et par examen ; on ne désinscrit pas un stagiaire qui a commencé.
create table public.tentatives (
	id uuid primary key default gen_random_uuid(),
	examen_id uuid not null,
	stagiaire_id uuid not null,
	debut timestamptz not null default now(),
	fin timestamptz,
	score int,
	total int,
	reussi boolean,
	resultat jsonb,
	unique (examen_id, stagiaire_id),
	foreign key (examen_id, stagiaire_id) references public.inscriptions (examen_id, stagiaire_id) on delete restrict
);
create index tentatives_stagiaire_idx on public.tentatives (stagiaire_id);

create table public.tentative_reponses (
	tentative_id uuid not null references public.tentatives (id) on delete cascade,
	question_id uuid not null,
	lettre text check (lettre in ('A', 'B', 'C', 'D')), -- null : signalée sans réponse
	signalee boolean not null default false,
	repondu_le timestamptz not null default now(),
	primary key (tentative_id, question_id)
);

-- Règles d'accès ---------------------------------------------------------------

alter table public.examens_officiels enable row level security;
alter table public.examen_codes enable row level security;
alter table public.examen_questions enable row level security;
alter table public.inscriptions enable row level security;
alter table public.tentatives enable row level security;
alter table public.tentative_reponses enable row level security;

-- Formateurs : lecture de tout ; écriture directe d'un examen tant qu'il est en brouillon.
-- Ouvrir, clore, composer passent par des fonctions.
create policy lecture_formateur on public.examens_officiels for select to authenticated using (est_formateur());
create policy creation_formateur on public.examens_officiels for insert to authenticated
	with check (est_formateur() and statut = 'brouillon');
create policy modif_formateur on public.examens_officiels for update to authenticated
	using (est_formateur() and statut = 'brouillon') with check (est_formateur() and statut = 'brouillon');
create policy suppression_formateur on public.examens_officiels for delete to authenticated
	using (est_formateur() and statut = 'brouillon');

create policy lecture_formateur on public.examen_codes for select to authenticated using (est_formateur());
create policy lecture_formateur on public.examen_questions for select to authenticated using (est_formateur());

-- Inscriptions : le formateur inscrit et désinscrit tant que l'examen n'est pas clos ; le stagiaire voit les siennes.
create policy lecture_formateur on public.inscriptions for select to authenticated using (est_formateur());
create policy lecture_soi on public.inscriptions for select to authenticated using (est_actif() and stagiaire_id = auth.uid());
create policy inscription_formateur on public.inscriptions for insert to authenticated
	with check (est_formateur() and exists (select 1 from examens_officiels e where e.id = examen_id and e.statut <> 'clos'));
create policy desinscription_formateur on public.inscriptions for delete to authenticated
	using (est_formateur() and exists (select 1 from examens_officiels e where e.id = examen_id and e.statut <> 'clos'));

create policy lecture_formateur on public.tentatives for select to authenticated using (est_formateur());
create policy lecture_soi on public.tentatives for select to authenticated using (est_actif() and stagiaire_id = auth.uid());

create policy lecture_formateur on public.tentative_reponses for select to authenticated using (est_formateur());

-- Rien pour le rôle « anon ».
revoke all on public.examens_officiels, public.examen_codes, public.examen_questions,
	public.inscriptions, public.tentatives, public.tentative_reponses from anon;
