-- Lot E : règles et recherche.

-- 1. Nombre de questions d'entraînement validées qui citent une règle (« 7 questions citent cette règle »).
create function public.nb_questions_regle(p_regle uuid) returns int
	language plpgsql stable security definer set search_path = public as $$
begin
	if not est_actif() then
		raise exception 'Compte inactif.' using errcode = '42501';
	end if;
	return (
		select count(*)::int from question_regles qr
		join questions q on q.id = qr.question_id
		where qr.regle_id = p_regle and q.statut = 'validee' and q.usage = 'entrainement'
	);
end $$;
revoke execute on function public.nb_questions_regle(uuid) from public, anon;
grant execute on function public.nb_questions_regle(uuid) to authenticated;

-- 2. Marque-pages : « Mes règles », propres à chaque compte.
create table public.regles_epinglees (
	stagiaire_id uuid not null default auth.uid() references public.profils (id) on delete cascade,
	regle_id uuid not null references public.regles (id) on delete cascade,
	cree_le timestamptz not null default now(),
	primary key (stagiaire_id, regle_id)
);
alter table public.regles_epinglees enable row level security;
create policy les_miennes on public.regles_epinglees for all to authenticated
	using (est_actif() and stagiaire_id = auth.uid()) with check (est_actif() and stagiaire_id = auth.uid());

-- 3. Glossaire : termes techniques expliqués au survol, rédigés par les formateurs.
create table public.glossaire (
	id uuid primary key default gen_random_uuid(),
	terme text not null check (length(trim(terme)) between 2 and 60),
	definition text not null check (length(trim(definition)) between 5 and 600),
	modifie_le timestamptz not null default now()
);
create unique index glossaire_terme_idx on public.glossaire (lower(terme));
alter table public.glossaire enable row level security;
create policy lecture on public.glossaire for select to authenticated using (est_actif());
create policy ecriture on public.glossaire for all to authenticated using (est_formateur()) with check (est_formateur());

-- 4. Figures du règlement (Fig.1a, Fig.9, Fig.11…) : légende et adresse de l'image, saisies par les formateurs.
create table public.figures (
	reference text primary key check (reference ~ '^Fig\.[0-9]+[a-z]?$'),
	legende text not null default '',
	image_url text check (image_url is null or image_url ~ '^https://'),
	modifie_le timestamptz not null default now()
);
alter table public.figures enable row level security;
create policy lecture on public.figures for select to authenticated using (est_actif());
create policy ecriture on public.figures for all to authenticated using (est_formateur()) with check (est_formateur());
