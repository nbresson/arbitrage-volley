-- Lot D : examen officiel.
-- 1. Sorties d'écran pendant l'examen, comptées par tentative (visibles du formateur dans le suivi en direct).
alter table public.tentatives add column sorties int not null default 0;

create function public.noter_sortie(p_tentative uuid) returns int
	language plpgsql security definer set search_path = public as $$
declare
	t tentatives;
begin
	t := ma_tentative(p_tentative);
	if t.fin is not null then
		return t.sorties;
	end if;
	update tentatives set sorties = sorties + 1 where id = t.id returning sorties into t.sorties;
	return t.sorties;
end $$;
revoke execute on function public.noter_sortie(uuid) from public, anon;
grant execute on function public.noter_sortie(uuid) to authenticated;

-- 2. Date et lieu de l'examen dans l'info de tentative (résultat officiel contextualisé).
drop function public.info_tentative(uuid);
create function public.info_tentative(p_tentative uuid)
returns table (id uuid, examen_id uuid, titre text, debut timestamptz, fin timestamptz, duree_minutes int, nb_questions int,
	maintenant timestamptz, date_heure timestamptz, lieu text)
	language plpgsql security definer set search_path = public as $$
declare
	t tentatives;
begin
	t := ma_tentative(p_tentative);
	return query
	select t.id, e.id, e.titre, t.debut, t.fin, e.duree_minutes,
		(select count(*)::int from examen_questions eq where eq.examen_id = e.id),
		now(), e.date_heure, e.lieu
	from examens_officiels e where e.id = t.examen_id;
end $$;
revoke execute on function public.info_tentative(uuid) from public, anon;
grant execute on function public.info_tentative(uuid) to authenticated;

-- 3. Suivi en direct : heure de début et de fin, réponses données, sorties, pour chaque inscrit.
drop function public.resultats_examen(uuid);
create function public.resultats_examen(p_examen uuid)
returns table (stagiaire_id uuid, prenom text, nom text, etat text, tentative_id uuid, score int, total int, reussi boolean,
	debut timestamptz, fin timestamptz, repondues int, sorties int, nb_questions int)
	language plpgsql stable security definer set search_path = public as $$
begin
	perform exiger_formateur();
	return query
	select i.stagiaire_id, p.prenom, p.nom,
		case when t.id is null then 'absent' when t.fin is null then 'en_cours' else 'termine' end,
		t.id, t.score, t.total, t.reussi,
		t.debut, t.fin,
		(select count(*)::int from tentative_reponses tr where tr.tentative_id = t.id and tr.lettre is not null),
		coalesce(t.sorties, 0),
		(select count(*)::int from examen_questions eq where eq.examen_id = p_examen)
	from inscriptions i
	join profils p on p.id = i.stagiaire_id
	left join tentatives t on t.examen_id = i.examen_id and t.stagiaire_id = i.stagiaire_id
	where i.examen_id = p_examen
	order by p.nom, p.prenom;
end $$;
revoke execute on function public.resultats_examen(uuid) from public, anon;
grant execute on function public.resultats_examen(uuid) to authenticated;
