-- Avancement filtré par rôle (accueil : pastilles « Arbitre / Marqueur »).
-- Même calcul qu'avant ; p_role null = toutes les questions.
drop function public.avancement(uuid);
create function public.avancement(p_stagiaire uuid default auth.uid(), p_role text default null)
returns table (theme_id uuid, theme text, ordre int, total int, acquises int, a_revoir int)
	language plpgsql stable security definer set search_path = public as $$
begin
	if not est_actif() or (p_stagiaire is distinct from auth.uid() and not est_formateur()) then
		raise exception 'Accès refusé.' using errcode = '42501';
	end if;
	return query
	with dernieres as (
		select distinct on (r.question_id) r.question_id, r.correcte
		from reponses r
		join seances s on s.id = r.seance_id
		where s.stagiaire_id = p_stagiaire and s.type = 'pedagogique' and r.correcte is not null
		order by r.question_id, r.repondu_le desc
	)
	select t.id, t.libelle, t.ordre,
		count(q.id)::int,
		count(q.id) filter (where d.correcte)::int,
		count(q.id) filter (where d.correcte = false)::int
	from themes t
	left join questions q on q.theme_id = t.id and q.statut = 'validee' and q.usage = 'entrainement'
		and (p_role is null or q.role_cible in (p_role, 'les_deux'))
	left join dernieres d on d.question_id = q.id
	group by t.id, t.libelle, t.ordre
	order by t.ordre;
end $$;

revoke execute on function public.avancement(uuid, text) from public, anon;
grant execute on function public.avancement(uuid, text) to authenticated;
