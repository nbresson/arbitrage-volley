-- Corrections issues de la revue finale de la V2.

-- 1. Ouverture : revérifier les questions composées (validées, de la réserve, avec une bonne réponse).
create or replace function public.ouvrir_examen(p_examen uuid) returns text
	language plpgsql security definer set search_path = public as $$
declare
	e examens_officiels;
	v_nb int;
	v_code text;
begin
	perform exiger_formateur();
	e := examen_verrouille(p_examen);
	if e.statut = 'clos' then
		raise exception 'Cet examen est clos.';
	end if;
	if e.statut = 'ouvert' then
		return (select code from examen_codes where examen_id = p_examen);
	end if;
	select count(*) into v_nb from examen_questions where examen_id = p_examen;
	if v_nb = 0 then
		raise exception 'Ajoutez au moins une question.';
	end if;
	if not exists (select 1 from inscriptions where examen_id = p_examen) then
		raise exception 'Inscrivez au moins un stagiaire.';
	end if;
	-- Entre la composition et l'ouverture, une question a pu repasser en brouillon, être archivée ou perdre sa bonne réponse.
	if exists (
		select 1 from examen_questions eq join questions q on q.id = eq.question_id
		where eq.examen_id = p_examen
			and (q.statut <> 'validee' or q.usage <> 'reserve_examen' or not exists (select 1 from bonnes_reponses br where br.question_id = q.id))
	) then
		raise exception 'Une question de l’examen n’est plus validée dans la réserve d’examen : retirez-la ou validez-la.';
	end if;
	if e.seuil_reussite > v_nb then
		raise exception 'Le seuil dépasse le nombre de questions.';
	end if;

	-- Copie figée : ce que les stagiaires liront et ce qui servira au calcul du score.
	update examen_questions eq set
		enonce = q.enonce,
		theme = coalesce(t.libelle, 'Sans thème'),
		propositions = (
			select jsonb_agg(jsonb_build_object('lettre', p.lettre, 'texte', p.texte) order by p.lettre)
			from propositions p where p.question_id = q.id
		),
		bonne_lettre = (
			select p.lettre from bonnes_reponses br join propositions p on p.id = br.proposition_id
			where br.question_id = q.id
		),
		regles = (
			select coalesce(jsonb_agg(jsonb_build_object(
				'reference', rg.reference, 'edition', ed.libelle, 'titre', rg.titre, 'principale', qr.principale
			) order by qr.principale desc, rg.reference), '[]'::jsonb)
			from question_regles qr
			join regles rg on rg.id = qr.regle_id
			join editions ed on ed.id = rg.edition_id
			where qr.question_id = q.id
		)
	from questions q
	left join themes t on t.id = q.theme_id
	where eq.examen_id = p_examen and q.id = eq.question_id;

	v_code := lpad(floor(random() * 1000000)::int::text, 6, '0');
	insert into examen_codes (examen_id, code) values (p_examen, v_code)
	on conflict (examen_id) do update set code = excluded.code;
	update examens_officiels set statut = 'ouvert', ouvert_le = now() where id = p_examen;
	return v_code;
end $$;

-- 2. L'heure du serveur, pour que le chronomètre de l'examen officiel ne dépende pas de l'horloge de l'appareil.
drop function public.info_tentative(uuid);
create function public.info_tentative(p_tentative uuid)
returns table (id uuid, examen_id uuid, titre text, debut timestamptz, fin timestamptz, duree_minutes int, nb_questions int, maintenant timestamptz)
	language plpgsql security definer set search_path = public as $$
declare
	t tentatives;
begin
	t := ma_tentative(p_tentative);
	return query
	select t.id, e.id, e.titre, t.debut, t.fin, e.duree_minutes,
		(select count(*)::int from examen_questions eq where eq.examen_id = e.id),
		now()
	from examens_officiels e where e.id = t.examen_id;
end $$;
revoke execute on function public.info_tentative(uuid) from public, anon;
grant execute on function public.info_tentative(uuid) to authenticated;

-- 3. Après la fin du temps, les questions ne sont plus lisibles (seuls les envois hors ligne restent acceptés).
create or replace function public.questions_de_tentative(p_tentative uuid)
returns table (ordre int, question_id uuid, enonce text, theme text, propositions jsonb, lettre_choisie text, signalee boolean)
	language plpgsql security definer set search_path = public as $$
declare
	t tentatives;
begin
	t := ma_tentative(p_tentative);
	if t.fin is not null then
		raise exception 'Votre examen est terminé.';
	end if;
	-- Heure du serveur : après la fin du temps (+ 2 min de décalage d'horloge toléré), plus de lecture des questions.
	if now() > t.debut + make_interval(mins => (select duree_minutes from examens_officiels where id = t.examen_id)) + interval '2 minutes' then
		raise exception 'Le temps de l’examen est écoulé.';
	end if;
	return query
	select eq.ordre, eq.question_id, eq.enonce, eq.theme, eq.propositions, tr.lettre, coalesce(tr.signalee, false)
	from examen_questions eq
	left join tentative_reponses tr on tr.tentative_id = t.id and tr.question_id = eq.question_id
	where eq.examen_id = t.examen_id
	order by eq.ordre;
end $$;
