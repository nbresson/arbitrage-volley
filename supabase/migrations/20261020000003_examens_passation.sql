-- Passation d'un examen officiel par le stagiaire : convocations, code d'accès, réponses, bilan.
-- Le stagiaire ne lit que la copie figée de SON examen, pendant SA tentative, jamais la bonne lettre.
-- Le score n'est jamais calculé dans le navigateur (finaliser_tentative, migration précédente).

-- Tentative de l'appelant, verrouillée ; erreur sinon. Interne.
create function public.ma_tentative(p_tentative uuid) returns public.tentatives
	language plpgsql security definer set search_path = public as $$
declare
	t tentatives;
begin
	if not est_actif() then
		raise exception 'Compte inactif.' using errcode = '42501';
	end if;
	select * into t from tentatives where id = p_tentative and stagiaire_id = auth.uid() for update;
	if not found then
		raise exception 'Examen introuvable.' using errcode = '42501';
	end if;
	return t;
end $$;

create function public.mes_convocations()
returns table (examen_id uuid, titre text, date_heure timestamptz, lieu text, duree_minutes int, nb_questions int,
	formateur text, statut text, tentative_id uuid, terminee boolean)
	language plpgsql stable security definer set search_path = public as $$
begin
	if not est_actif() then
		raise exception 'Compte inactif.' using errcode = '42501';
	end if;
	return query
	select e.id, e.titre, e.date_heure, e.lieu, e.duree_minutes,
		(select count(*)::int from examen_questions eq where eq.examen_id = e.id),
		nullif(trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), ''),
		e.statut, t.id, coalesce(t.fin is not null, false)
	from inscriptions i
	join examens_officiels e on e.id = i.examen_id
	left join profils p on p.id = e.cree_par
	left join tentatives t on t.examen_id = e.id and t.stagiaire_id = i.stagiaire_id
	where i.stagiaire_id = auth.uid()
		and (e.statut <> 'clos' or (t.id is not null and e.clos_le > now() - interval '7 days'))
	order by e.date_heure;
end $$;

create function public.commencer_tentative(p_examen uuid, p_code text) returns uuid
	language plpgsql security definer set search_path = public as $$
declare
	e examens_officiels;
	v_id uuid;
begin
	if not est_actif() then
		raise exception 'Compte inactif.' using errcode = '42501';
	end if;
	if not exists (select 1 from inscriptions where examen_id = p_examen and stagiaire_id = auth.uid()) then
		raise exception 'Vous n’êtes pas inscrit à cet examen.' using errcode = '42501';
	end if;
	select * into e from examens_officiels where id = p_examen;
	if e.statut = 'brouillon' then
		raise exception 'L’examen n’est pas encore ouvert.';
	end if;
	if e.statut = 'clos' then
		raise exception 'Cet examen est clos.';
	end if;
	if not exists (
		select 1 from examen_codes where examen_id = p_examen and code = regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g')
	) then
		raise exception 'Code d’accès incorrect.';
	end if;
	-- Une seule tentative : la reprise renvoie celle qui existe (le chronomètre ne repart pas).
	insert into tentatives (examen_id, stagiaire_id) values (p_examen, auth.uid())
	on conflict (examen_id, stagiaire_id) do nothing
	returning id into v_id;
	if v_id is null then
		select id into v_id from tentatives where examen_id = p_examen and stagiaire_id = auth.uid();
	end if;
	return v_id;
end $$;

create function public.info_tentative(p_tentative uuid)
returns table (id uuid, examen_id uuid, titre text, debut timestamptz, fin timestamptz, duree_minutes int, nb_questions int)
	language plpgsql security definer set search_path = public as $$
declare
	t tentatives;
begin
	t := ma_tentative(p_tentative);
	return query
	select t.id, e.id, e.titre, t.debut, t.fin, e.duree_minutes,
		(select count(*)::int from examen_questions eq where eq.examen_id = e.id)
	from examens_officiels e where e.id = t.examen_id;
end $$;

create function public.questions_de_tentative(p_tentative uuid)
returns table (ordre int, question_id uuid, enonce text, theme text, propositions jsonb, lettre_choisie text, signalee boolean)
	language plpgsql security definer set search_path = public as $$
declare
	t tentatives;
begin
	t := ma_tentative(p_tentative);
	if t.fin is not null then
		raise exception 'Votre examen est terminé.';
	end if;
	return query
	select eq.ordre, eq.question_id, eq.enonce, eq.theme, eq.propositions, tr.lettre, coalesce(tr.signalee, false)
	from examen_questions eq
	left join tentative_reponses tr on tr.tentative_id = t.id and tr.question_id = eq.question_id
	where eq.examen_id = t.examen_id
	order by eq.ordre;
end $$;

-- Contrôles communs à la réponse et au signalement.
create function public.tentative_modifiable(p_tentative uuid, p_question uuid) returns public.tentatives
	language plpgsql security definer set search_path = public as $$
declare
	t tentatives;
begin
	t := ma_tentative(p_tentative);
	if (select statut from examens_officiels where id = t.examen_id) = 'clos' then
		raise exception 'Cet examen est clos.';
	end if;
	if t.fin is not null then
		raise exception 'Votre examen est terminé.';
	end if;
	if not exists (select 1 from examen_questions where examen_id = t.examen_id and question_id = p_question) then
		raise exception 'Question absente de l’examen.' using errcode = '42501';
	end if;
	return t;
end $$;

create function public.repondre_tentative(p_tentative uuid, p_question uuid, p_lettre text, p_repondu_le timestamptz default now())
returns jsonb
	language plpgsql security definer set search_path = public as $$
declare
	t tentatives;
	v_fin timestamptz;
begin
	t := tentative_modifiable(p_tentative, p_question);
	if p_lettre is null or p_lettre not in ('A', 'B', 'C', 'D') then
		raise exception 'Proposition invalide.' using errcode = '42501';
	end if;
	-- Mêmes règles de temps que l'examen d'entraînement (valider_reponse, V1).
	v_fin := t.debut + make_interval(mins => (select duree_minutes from examens_officiels where id = t.examen_id));
	if p_repondu_le > v_fin
		or p_repondu_le < t.debut - interval '2 minutes'
		or p_repondu_le > now() + interval '2 minutes'
		or now() > v_fin + interval '15 minutes' then
		raise exception 'Le temps de l’examen est écoulé.';
	end if;
	insert into tentative_reponses (tentative_id, question_id, lettre, repondu_le)
	values (p_tentative, p_question, p_lettre, least(p_repondu_le, now()))
	on conflict (tentative_id, question_id)
	do update set lettre = excluded.lettre, repondu_le = excluded.repondu_le
	where tentative_reponses.lettre is null or tentative_reponses.repondu_le <= excluded.repondu_le;
	return jsonb_build_object('enregistree', true);
end $$;

create function public.signaler_tentative(p_tentative uuid, p_question uuid, p_signalee boolean) returns void
	language plpgsql security definer set search_path = public as $$
begin
	perform tentative_modifiable(p_tentative, p_question);
	insert into tentative_reponses (tentative_id, question_id, signalee)
	values (p_tentative, p_question, p_signalee)
	on conflict (tentative_id, question_id) do update set signalee = excluded.signalee;
end $$;

create function public.terminer_tentative(p_tentative uuid) returns jsonb
	language plpgsql security definer set search_path = public as $$
begin
	perform ma_tentative(p_tentative);
	return finaliser_tentative(p_tentative);
end $$;

revoke execute on function public.mes_convocations(), public.commencer_tentative(uuid, text), public.info_tentative(uuid),
	public.questions_de_tentative(uuid), public.repondre_tentative(uuid, uuid, text, timestamptz),
	public.signaler_tentative(uuid, uuid, boolean), public.terminer_tentative(uuid) from public, anon;
grant execute on function public.mes_convocations(), public.commencer_tentative(uuid, text), public.info_tentative(uuid),
	public.questions_de_tentative(uuid), public.repondre_tentative(uuid, uuid, text, timestamptz),
	public.signaler_tentative(uuid, uuid, boolean), public.terminer_tentative(uuid) to authenticated;
revoke execute on function public.ma_tentative(uuid), public.tentative_modifiable(uuid, uuid) from public, anon, authenticated;
