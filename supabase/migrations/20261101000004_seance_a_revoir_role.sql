-- « Revoir mes questions à revoir » suit le filtre de rôle de l'accueil, comme le compteur
-- « À revoir » d'avancement(p_role) : sans quoi le bouton annonce N questions et en propose davantage.
drop function public.seance_a_revoir();
create function public.seance_a_revoir(p_role text default null) returns uuid
	language plpgsql security definer set search_path = public as $$
declare
	v_id uuid;
	v_nb int;
begin
	if not est_actif() then
		raise exception 'Compte inactif.' using errcode = '42501';
	end if;
	insert into seances (stagiaire_id, type, nb_questions, filtre)
	values (auth.uid(), 'pedagogique', 1, jsonb_build_object('a_revoir', true) || case when p_role is null then '{}'::jsonb else jsonb_build_object('role', p_role) end)
	returning id into v_id;

	insert into seance_questions (seance_id, question_id, ordre)
	select v_id, d.question_id, row_number() over (order by random())
	from (
		select distinct on (r.question_id) r.question_id, r.correcte
		from reponses r
		join seances s on s.id = r.seance_id
		where s.stagiaire_id = auth.uid() and s.type = 'pedagogique' and r.correcte is not null
		order by r.question_id, r.repondu_le desc
	) d
	join questions q on q.id = d.question_id
	where d.correcte = false and q.statut = 'validee' and q.usage = 'entrainement'
		and (p_role is null or q.role_cible in (p_role, 'les_deux'));

	get diagnostics v_nb = row_count;
	if v_nb = 0 then
		delete from seances where id = v_id;
		raise exception 'Aucune question à revoir.';
	end if;
	update seances set nb_questions = v_nb where id = v_id;
	return v_id;
end $$;
revoke execute on function public.seance_a_revoir(text) from public, anon;
grant execute on function public.seance_a_revoir(text) to authenticated;
