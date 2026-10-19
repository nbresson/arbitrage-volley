-- Schéma V1 de la plateforme de formation des arbitres.
-- Énumérations en « check » sur du texte : plus lisible pour des bénévoles que des types enum.

-- Référentiel ------------------------------------------------------------

create table public.editions (
	id uuid primary key default gen_random_uuid(),
	source text not null check (source in ('fivb_regles', 'casebook', 'cfa')),
	libelle text not null unique,
	active boolean not null default true,
	cree_le timestamptz not null default now()
);

create table public.regles (
	id uuid primary key default gen_random_uuid(),
	edition_id uuid not null references public.editions (id) on delete cascade,
	reference text not null,
	parent_reference text,
	titre text,
	texte text not null default '',
	texte_original text,
	renvois text[] not null default '{}',
	video_url text,
	chapitre text,
	rubrique text,
	ordre int not null default 0,
	unique (edition_id, reference)
);
create index regles_edition_idx on public.regles (edition_id);

create table public.themes (
	id uuid primary key default gen_random_uuid(),
	libelle text not null unique,
	ordre int not null default 0
);

create table public.niveaux (
	id uuid primary key default gen_random_uuid(),
	libelle text not null unique,
	ordre int not null default 0
);

-- Comptes ------------------------------------------------------------------

create table public.profils (
	id uuid primary key references auth.users (id) on delete cascade,
	prenom text not null,
	nom text not null,
	email text,
	role text not null default 'stagiaire' check (role in ('stagiaire', 'formateur')),
	profil_formation text not null default 'arbitre' check (profil_formation in ('arbitre', 'marqueur')),
	niveau_id uuid references public.niveaux (id) on delete set null,
	actif boolean not null default true,
	mineur_parents_informes boolean,
	notice_acceptee_le timestamptz,
	cree_le timestamptz not null default now(),
	desactive_le timestamptz
);

-- Questions ----------------------------------------------------------------

create table public.questions (
	id uuid primary key default gen_random_uuid(),
	enonce text not null,
	explication text not null default '',
	niveau_id uuid references public.niveaux (id) on delete set null,
	theme_id uuid references public.themes (id) on delete set null,
	role_cible text not null default 'arbitre' check (role_cible in ('arbitre', 'marqueur', 'les_deux')),
	usage text not null default 'entrainement' check (usage in ('entrainement', 'reserve_examen')),
	video_url text,
	statut text not null default 'brouillon' check (statut in ('brouillon', 'validee', 'archivee')),
	a_relire boolean not null default false,
	origine text not null default 'manuelle' check (origine in ('casebook', 'manuelle')),
	origine_regle_id uuid,
	auteur_id uuid references public.profils (id) on delete set null,
	valide_par uuid references public.profils (id) on delete set null,
	valide_le timestamptz,
	cree_le timestamptz not null default now(),
	modifie_le timestamptz not null default now(),
	constraint questions_origine_regle_id_fkey foreign key (origine_regle_id) references public.regles (id) on delete set null,
	-- une seule question par cas du Casebook (clé du chargeur idempotent)
	constraint questions_origine_regle_unique unique (origine_regle_id)
);
create index questions_theme_idx on public.questions (theme_id);
create index questions_statut_idx on public.questions (statut, usage);

-- La bonne réponse n'est PAS une colonne des propositions : elle vit dans
-- bonnes_reponses, illisible pour les stagiaires (voir les règles d'accès).
create table public.propositions (
	id uuid primary key default gen_random_uuid(),
	question_id uuid not null references public.questions (id) on delete cascade,
	lettre text not null check (lettre in ('A', 'B', 'C', 'D')),
	texte text not null,
	unique (question_id, lettre)
);

create table public.bonnes_reponses (
	question_id uuid primary key references public.questions (id) on delete cascade,
	proposition_id uuid not null references public.propositions (id) on delete cascade
);

create table public.question_regles (
	question_id uuid not null references public.questions (id) on delete cascade,
	regle_id uuid not null references public.regles (id) on delete cascade,
	principale boolean not null default false,
	primary key (question_id, regle_id)
);
create index question_regles_regle_idx on public.question_regles (regle_id);

-- Séances ------------------------------------------------------------------

create table public.seances (
	id uuid primary key default gen_random_uuid(),
	stagiaire_id uuid not null default auth.uid() references public.profils (id) on delete cascade,
	type text not null check (type in ('pedagogique', 'examen_entrainement')),
	filtre jsonb not null default '{}',
	nb_questions int not null check (nb_questions > 0),
	duree_minutes int check (duree_minutes > 0),
	debut timestamptz not null default now(),
	fin timestamptz
);
create index seances_stagiaire_idx on public.seances (stagiaire_id, debut desc);

-- Tirage figé d'une séance
create table public.seance_questions (
	seance_id uuid not null references public.seances (id) on delete cascade,
	question_id uuid not null references public.questions (id) on delete cascade,
	ordre int not null,
	primary key (seance_id, question_id),
	unique (seance_id, ordre)
);

create table public.reponses (
	id uuid primary key default gen_random_uuid(),
	seance_id uuid not null references public.seances (id) on delete cascade,
	question_id uuid not null references public.questions (id) on delete cascade,
	proposition_id uuid references public.propositions (id) on delete cascade, -- null : signalée sans réponse
	correcte boolean,
	signalee boolean not null default false,
	repondu_le timestamptz not null default now(),
	unique (seance_id, question_id)
);
create index reponses_question_idx on public.reponses (question_id);

-- Date de modification des questions
create function public.toucher_modifie_le() returns trigger language plpgsql as $$
begin
	new.modifie_le := now();
	return new;
end $$;
create trigger questions_modifie_le before update on public.questions
	for each row execute function public.toucher_modifie_le();
