-- Corrections issues de la revue finale de la V1.

-- 1. Examen : ordre des réponses et délai.
--    - une réponse plus ancienne arrivée après une plus récente ne l'écrase pas ;
--    - l'heure annoncée par l'appareil doit être dans l'examen, et le renvoi d'une réponse gardée
--      hors ligne n'est plus accepté au-delà de 15 minutes après la fin (antidatage impossible ensuite).
-- 2. Pédagogique : la réponse indique la proposition réellement enregistrée (la première fait foi).
create or replace function public.valider_reponse(p_seance uuid, p_question uuid, p_proposition uuid, p_repondu_le timestamptz default now())
returns jsonb
	language plpgsql security definer set search_path = public as $$
declare
	s seances;
	v_bonne uuid;
	v_fin timestamptz;
	r reponses;
begin
	s := ma_seance(p_seance);
	if s.fin is not null then
		raise exception 'Cette séance est terminée.';
	end if;
	if not exists (select 1 from seance_questions where seance_id = p_seance and question_id = p_question) then
		raise exception 'Question absente de la séance.' using errcode = '42501';
	end if;
	if not exists (select 1 from propositions where id = p_proposition and question_id = p_question) then
		raise exception 'Proposition invalide.' using errcode = '42501';
	end if;
	select proposition_id into v_bonne from bonnes_reponses where question_id = p_question;

	if s.type = 'examen_entrainement' then
		v_fin := s.debut + make_interval(mins => s.duree_minutes);
		if p_repondu_le > v_fin
			or p_repondu_le < s.debut - interval '2 minutes' -- tolérance de décalage d'horloge
			or p_repondu_le > now() + interval '2 minutes'
			or now() > v_fin + interval '15 minutes' then
			raise exception 'Le temps de l’examen est écoulé.';
		end if;
		insert into reponses (seance_id, question_id, proposition_id, correcte, repondu_le)
		values (p_seance, p_question, p_proposition, null, least(p_repondu_le, now()))
		on conflict (seance_id, question_id)
		do update set proposition_id = excluded.proposition_id, repondu_le = excluded.repondu_le
		where reponses.proposition_id is null or reponses.repondu_le <= excluded.repondu_le;
		return jsonb_build_object('enregistree', true);
	end if;

	insert into reponses (seance_id, question_id, proposition_id, correcte)
	values (p_seance, p_question, p_proposition, p_proposition = v_bonne)
	on conflict (seance_id, question_id) do update
		set proposition_id = coalesce(reponses.proposition_id, excluded.proposition_id),
			correcte = coalesce(reponses.correcte, excluded.correcte)
	returning * into r;

	return jsonb_build_object(
		'correcte', r.correcte,
		'proposition_id', r.proposition_id,
		'bonne_proposition_id', v_bonne,
		'explication', (select explication from questions where id = p_question),
		'sources', sources_question(p_question)
	);
end $$;

-- 3. Fonctions internes : jamais appelables directement par un compte (Supabase accorde EXECUTE par défaut).
revoke execute on function public.sources_question(uuid), public.ma_seance(uuid) from authenticated;

-- 4. Un formateur ne peut pas désactiver son propre compte (il se verrouillerait dehors).
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
	if (new.role, new.prenom, new.nom, new.email, new.profil_formation, new.niveau_id, new.actif, new.mineur_parents_informes, new.desactive_le)
		is distinct from
		(old.role, old.prenom, old.nom, old.email, old.profil_formation, old.niveau_id, old.actif, old.mineur_parents_informes, old.desactive_le) then
		raise exception 'Modification non autorisée' using errcode = '42501';
	end if;
	return new;
end $$;
