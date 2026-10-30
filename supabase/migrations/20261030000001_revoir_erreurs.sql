-- « Revoir mes erreurs » : une nouvelle séance pédagogique faite des questions ratées d'une séance du stagiaire.
-- Seules les questions encore validées d'entraînement sont reprises (une question repassée en brouillon ou
-- versée dans la réserve d'examen depuis ne l'est pas).
create function public.revoir_erreurs(p_seance uuid) returns uuid
	language plpgsql security definer set search_path = public as $$
declare
	v_id uuid;
	v_nb int;
begin
	if not est_actif() then
		raise exception 'Compte inactif.' using errcode = '42501';
	end if;
	if not exists (select 1 from seances where id = p_seance and stagiaire_id = auth.uid()) then
		raise exception 'Séance introuvable.' using errcode = '42501';
	end if;

	insert into seances (stagiaire_id, type, nb_questions, filtre)
	values (auth.uid(), 'pedagogique', 1, jsonb_build_object('revision_de', p_seance))
	returning id into v_id;

	insert into seance_questions (seance_id, question_id, ordre)
	select v_id, q.id, row_number() over (order by random())
	from reponses r
	join questions q on q.id = r.question_id
	where r.seance_id = p_seance
		and r.correcte = false
		and q.statut = 'validee'
		and q.usage = 'entrainement';

	get diagnostics v_nb = row_count;
	if v_nb = 0 then
		delete from seances where id = v_id;
		raise exception 'Aucune erreur à revoir dans cette séance.';
	end if;
	update seances set nb_questions = v_nb where id = v_id;
	return v_id;
end $$;

revoke execute on function public.revoir_erreurs(uuid) from public, anon;
grant execute on function public.revoir_erreurs(uuid) to authenticated;
