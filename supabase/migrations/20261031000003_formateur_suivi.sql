-- Lot G : formateur, stagiaires et examens.

-- 1. Promotion (session de formation) d'un compte, posée par les formateurs pour filtrer la liste.
alter table public.profils add column promotion text check (promotion is null or length(trim(promotion)) between 1 and 60);

-- Le stagiaire ne peut toujours changer que la date d'acceptation de la notice : la promotion rejoint les champs protégés.
create or replace function public.proteger_profil() returns trigger
	language plpgsql security definer set search_path = public as $$
begin
	if auth.uid() is not null and old.id = auth.uid() and old.actif and not new.actif then
		raise exception 'Vous ne pouvez pas désactiver votre propre compte.' using errcode = '42501';
	end if;
	if auth.uid() is null or est_formateur() then
		if new.actif is distinct from old.actif then
			new.desactive_le := case when new.actif then null else now() end;
		end if;
		return new;
	end if;
	if (new.role, new.prenom, new.nom, new.email, new.profil_formation, new.niveau_id, new.actif, new.mineur_parents_informes, new.desactive_le, new.promotion)
		is distinct from
		(old.role, old.prenom, old.nom, old.email, old.profil_formation, old.niveau_id, old.actif, old.mineur_parents_informes, old.desactive_le, old.promotion) then
		raise exception 'Modification non autorisée' using errcode = '42501';
	end if;
	return new;
end $$;

-- 2. Dernière activité de chaque stagiaire : séances pédagogiques et examens officiels
--    (jamais les examens blancs, qui restent privés).
create function public.activite_stagiaires()
returns table (stagiaire_id uuid, derniere timestamptz)
	language plpgsql stable security definer set search_path = public as $$
begin
	perform exiger_formateur();
	return query
	select x.stagiaire_id, max(x.quand)
	from (
		select s.stagiaire_id, coalesce(s.fin, s.debut) as quand from seances s where s.type = 'pedagogique'
		union all
		select t.stagiaire_id, coalesce(t.fin, t.debut) from tentatives t
	) x
	group by x.stagiaire_id;
end $$;
revoke execute on function public.activite_stagiaires() from public, anon;
grant execute on function public.activite_stagiaires() to authenticated;

-- 3. Statistiques par question d'un examen officiel (tentatives terminées) : repérer les questions mal posées.
create function public.stats_examen(p_examen uuid)
returns table (ordre int, question_id uuid, enonce text, bonne_lettre text, repondants int, justes int, sans_reponse int)
	language plpgsql stable security definer set search_path = public as $$
begin
	perform exiger_formateur();
	return query
	select eq.ordre, eq.question_id, eq.enonce, eq.bonne_lettre,
		count(t.id)::int,
		count(t.id) filter (where tr.lettre = eq.bonne_lettre)::int,
		count(t.id) filter (where tr.lettre is null)::int
	from examen_questions eq
	left join tentatives t on t.examen_id = eq.examen_id and t.fin is not null
	left join tentative_reponses tr on tr.tentative_id = t.id and tr.question_id = eq.question_id
	where eq.examen_id = p_examen
	group by eq.ordre, eq.question_id, eq.enonce, eq.bonne_lettre
	order by eq.ordre;
end $$;
revoke execute on function public.stats_examen(uuid) from public, anon;
grant execute on function public.stats_examen(uuid) to authenticated;
