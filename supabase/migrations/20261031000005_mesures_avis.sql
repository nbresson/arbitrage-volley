-- Lot J : mesures minimales d'usage (sans traceur externe) et avis après l'examen officiel.

-- 1. Mesures d'usage pour le comité : des totaux par jour et par thème, jamais de détail par personne.
--    Seules les séances pédagogiques comptent (les examens blancs restent privés).
create function public.mesures_jours(p_jours int default 30)
returns table (jour date, seances int, stagiaires int, reponses int)
	language plpgsql stable security definer set search_path = public as $$
begin
	perform exiger_formateur();
	return query
	select (s.debut at time zone 'Europe/Paris')::date,
		count(distinct s.id)::int,
		count(distinct s.stagiaire_id)::int,
		count(r.question_id)::int
	from seances s
	left join reponses r on r.seance_id = s.id
	where s.type = 'pedagogique' and s.debut >= now() - make_interval(days => least(greatest(coalesce(p_jours, 30), 1), 365))
	group by 1
	order by 1;
end $$;

create function public.mesures_themes(p_jours int default 30)
returns table (theme text, reponses int, justes int)
	language plpgsql stable security definer set search_path = public as $$
begin
	perform exiger_formateur();
	return query
	select coalesce(t.libelle, 'Sans thème'), count(*)::int, count(*) filter (where r.correcte)::int
	from reponses r
	join seances s on s.id = r.seance_id
	join questions q on q.id = r.question_id
	left join themes t on t.id = q.theme_id
	where s.type = 'pedagogique' and r.correcte is not null
		and s.debut >= now() - make_interval(days => least(greatest(coalesce(p_jours, 30), 1), 365))
	group by 1
	order by 2 desc;
end $$;

revoke execute on function public.mesures_jours(int), public.mesures_themes(int) from public, anon;
grant execute on function public.mesures_jours(int), public.mesures_themes(int) to authenticated;

-- 2. Avis après l'examen officiel : une note de 1 à 5 et un commentaire facultatif, une fois l'examen terminé.
--    Les formateurs lisent les avis d'un examen sans le nom de leur auteur.
create table public.avis_examen (
	tentative_id uuid primary key references public.tentatives (id) on delete cascade,
	note int not null check (note between 1 and 5),
	commentaire text check (commentaire is null or length(commentaire) <= 1000),
	cree_le timestamptz not null default now()
);
alter table public.avis_examen enable row level security;
-- Aucun accès direct : tout passe par les fonctions ci-dessous.

create function public.donner_avis(p_tentative uuid, p_note int, p_commentaire text) returns void
	language plpgsql security definer set search_path = public as $$
declare
	t tentatives;
begin
	t := ma_tentative(p_tentative);
	if t.fin is null then
		raise exception 'Donnez votre avis une fois l’examen terminé.';
	end if;
	insert into avis_examen (tentative_id, note, commentaire)
	values (t.id, p_note, nullif(trim(coalesce(p_commentaire, '')), ''))
	on conflict (tentative_id) do update set note = excluded.note, commentaire = excluded.commentaire, cree_le = now();
end $$;

create function public.mon_avis(p_tentative uuid) returns table (note int, commentaire text)
	language plpgsql security definer set search_path = public as $$
declare
	t tentatives;
begin
	t := ma_tentative(p_tentative);
	return query select a.note, a.commentaire from avis_examen a where a.tentative_id = t.id;
end $$;

create function public.avis_de_l_examen(p_examen uuid) returns table (note int, commentaire text, cree_le timestamptz)
	language plpgsql stable security definer set search_path = public as $$
begin
	perform exiger_formateur();
	return query
	select a.note, a.commentaire, a.cree_le
	from avis_examen a join tentatives t on t.id = a.tentative_id
	where t.examen_id = p_examen
	order by a.cree_le;
end $$;

revoke execute on function public.donner_avis(uuid, int, text), public.mon_avis(uuid), public.avis_de_l_examen(uuid) from public, anon;
grant execute on function public.donner_avis(uuid, int, text), public.mon_avis(uuid), public.avis_de_l_examen(uuid) to authenticated;
