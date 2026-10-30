-- Revue UX (n° 36) : courbes de la liste des stagiaires.
-- Les p_n dernières séances pédagogiques de CHAQUE stagiaire ayant au moins une réponse corrigée,
-- avec leurs bonnes réponses (remplace une lecture plafonnée à 1 000 séances pour tout le comité).
create function public.dernieres_seances(p_n int default 5)
returns table (stagiaire_id uuid, debut timestamptz, justes int, total int)
	language plpgsql stable security definer set search_path = public as $$
begin
	perform exiger_formateur();
	return query
	select x.stagiaire_id, x.debut, x.justes, x.total
	from (
		select s.stagiaire_id, s.debut,
			count(*) filter (where r.correcte)::int as justes,
			count(*)::int as total,
			row_number() over (partition by s.stagiaire_id order by s.debut desc) as rang
		from seances s
		join reponses r on r.seance_id = s.id and r.correcte is not null
		where s.type = 'pedagogique'
		group by s.id, s.stagiaire_id, s.debut
	) x
	where x.rang <= least(greatest(coalesce(p_n, 5), 1), 20)
	order by x.stagiaire_id, x.debut;
end $$;
revoke execute on function public.dernieres_seances(int) from public, anon;
grant execute on function public.dernieres_seances(int) to authenticated;
