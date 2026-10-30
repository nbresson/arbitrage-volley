-- Lot C : rejouer un examen blanc terminé.
-- p_avec_correction = true : séance pédagogique, mêmes questions dans le même ordre (« revoir l'examen avec la correction »).
-- p_avec_correction = false : nouvel examen blanc, mêmes questions dans un nouvel ordre, même durée (« refaire le même examen »).
-- L'examen doit être terminé : une séance pédagogique tirée d'un examen en cours en révélerait les corrections.
-- Seules les questions encore validées d'entraînement sont reprises.
create function public.rejouer_examen(p_seance uuid, p_avec_correction boolean) returns uuid
	language plpgsql security definer set search_path = public as $$
declare
	s seances;
	v_id uuid;
	v_nb int;
begin
	if not est_actif() then
		raise exception 'Compte inactif.' using errcode = '42501';
	end if;
	select * into s from seances where id = p_seance and stagiaire_id = auth.uid();
	if not found then
		raise exception 'Séance introuvable.' using errcode = '42501';
	end if;
	if s.type <> 'examen_entrainement' then
		raise exception 'Seul un examen blanc peut être rejoué.';
	end if;
	if s.fin is null then
		raise exception 'Terminez l’examen avant de le rejouer.';
	end if;

	insert into seances (stagiaire_id, type, nb_questions, duree_minutes, filtre)
	values (
		auth.uid(),
		case when p_avec_correction then 'pedagogique' else 'examen_entrainement' end,
		1,
		case when p_avec_correction then null else s.duree_minutes end,
		jsonb_build_object('reprise_de', p_seance)
	)
	returning id into v_id;

	insert into seance_questions (seance_id, question_id, ordre)
	select v_id, q.id, row_number() over (order by case when p_avec_correction then sq.ordre::float8 else random() end)
	from seance_questions sq
	join questions q on q.id = sq.question_id
	where sq.seance_id = p_seance
		and q.statut = 'validee'
		and q.usage = 'entrainement';

	get diagnostics v_nb = row_count;
	if v_nb = 0 then
		delete from seances where id = v_id;
		raise exception 'Aucune question de cet examen n’est encore disponible.';
	end if;
	update seances set nb_questions = v_nb where id = v_id;
	return v_id;
end $$;

revoke execute on function public.rejouer_examen(uuid, boolean) from public, anon;
grant execute on function public.rejouer_examen(uuid, boolean) to authenticated;
