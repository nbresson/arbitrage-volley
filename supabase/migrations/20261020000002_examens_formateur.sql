-- Fonctions des formateurs pour les examens officiels : composer, ouvrir (copie figée + code), clore, résultats.
-- Toutes vérifient que l'appelant est formateur.

create function public.exiger_formateur() returns void
	language plpgsql stable security definer set search_path = public as $$
begin
	if not est_formateur() then
		raise exception 'Réservé aux formateurs.' using errcode = '42501';
	end if;
end $$;

-- Examen verrouillé pour modification ; erreur s'il n'existe pas.
create function public.examen_verrouille(p_examen uuid) returns public.examens_officiels
	language plpgsql security definer set search_path = public as $$
declare
	e examens_officiels;
begin
	select * into e from examens_officiels where id = p_examen for update;
	if not found then
		raise exception 'Examen introuvable.' using errcode = '42501';
	end if;
	return e;
end $$;

create function public.composer_examen(p_examen uuid, p_question_ids uuid[]) returns int
	language plpgsql security definer set search_path = public as $$
declare
	e examens_officiels;
	v_nb int;
begin
	perform exiger_formateur();
	e := examen_verrouille(p_examen);
	if e.statut <> 'brouillon' then
		raise exception 'Cet examen est déjà ouvert.';
	end if;
	if exists (
		select 1 from unnest(coalesce(p_question_ids, '{}')) as x(id)
		where not exists (select 1 from questions q where q.id = x.id and q.statut = 'validee' and q.usage = 'reserve_examen')
	) then
		raise exception 'Seules les questions validées de la réserve d’examen peuvent être ajoutées.';
	end if;
	delete from examen_questions where examen_id = p_examen;
	insert into examen_questions (examen_id, question_id, ordre)
	select p_examen, x.id, x.n::int from unnest(coalesce(p_question_ids, '{}')) with ordinality as x(id, n);
	get diagnostics v_nb = row_count;
	return v_nb;
end $$;

create function public.ouvrir_examen(p_examen uuid) returns text
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

-- Calcule et enregistre le bilan d'une tentative depuis la copie figée. Interne, idempotente.
create function public.finaliser_tentative(p_tentative uuid) returns jsonb
	language plpgsql security definer set search_path = public as $$
declare
	t tentatives;
	v_seuil int;
	v_bilan jsonb;
begin
	select * into t from tentatives where id = p_tentative for update;
	if not found then
		raise exception 'Examen introuvable.' using errcode = '42501';
	end if;
	if t.resultat is not null then
		return t.resultat;
	end if;
	select seuil_reussite into v_seuil from examens_officiels where id = t.examen_id;

	with detail as (
		select eq.ordre, eq.theme, (tr.lettre is not null and tr.lettre = eq.bonne_lettre) as juste
		from examen_questions eq
		left join tentative_reponses tr on tr.tentative_id = t.id and tr.question_id = eq.question_id
		where eq.examen_id = t.examen_id
	), par_theme as (
		select theme, min(ordre) as premier, count(*) filter (where juste) as justes, count(*) as total
		from detail group by theme
	), score as (
		select count(*) filter (where juste)::int as score, count(*)::int as total from detail
	)
	select jsonb_build_object(
		'score', s.score,
		'total', s.total,
		'seuil', v_seuil,
		'reussi', s.score >= v_seuil,
		'par_theme', coalesce((select jsonb_agg(jsonb_build_object('theme', theme, 'justes', justes, 'total', total) order by premier) from par_theme), '[]'::jsonb)
	) into v_bilan
	from score s;

	update tentatives set
		fin = coalesce(fin, now()),
		score = (v_bilan ->> 'score')::int,
		total = (v_bilan ->> 'total')::int,
		reussi = (v_bilan ->> 'reussi')::boolean,
		resultat = v_bilan
	where id = p_tentative;
	return v_bilan;
end $$;

create function public.clore_examen(p_examen uuid) returns void
	language plpgsql security definer set search_path = public as $$
declare
	e examens_officiels;
	v_t uuid;
begin
	perform exiger_formateur();
	e := examen_verrouille(p_examen);
	if e.statut = 'clos' then
		return;
	end if;
	if e.statut = 'brouillon' then
		raise exception 'Cet examen n’est pas ouvert.';
	end if;
	update examens_officiels set statut = 'clos', clos_le = now() where id = p_examen;
	for v_t in select id from tentatives where examen_id = p_examen and resultat is null loop
		perform finaliser_tentative(v_t);
	end loop;
end $$;

create function public.resultats_examen(p_examen uuid)
returns table (stagiaire_id uuid, prenom text, nom text, etat text, tentative_id uuid, score int, total int, reussi boolean)
	language plpgsql stable security definer set search_path = public as $$
begin
	perform exiger_formateur();
	return query
	select i.stagiaire_id, p.prenom, p.nom,
		case when t.id is null then 'absent' when t.fin is null then 'en_cours' else 'termine' end,
		t.id, t.score, t.total, t.reussi
	from inscriptions i
	join profils p on p.id = i.stagiaire_id
	left join tentatives t on t.examen_id = i.examen_id and t.stagiaire_id = i.stagiaire_id
	where i.examen_id = p_examen
	order by p.nom, p.prenom;
end $$;

create function public.detail_tentative(p_tentative uuid) returns jsonb
	language plpgsql stable security definer set search_path = public as $$
declare
	t tentatives;
	e examens_officiels;
begin
	perform exiger_formateur();
	select * into t from tentatives where id = p_tentative;
	if not found then
		raise exception 'Examen introuvable.' using errcode = '42501';
	end if;
	if t.resultat is null then
		raise exception 'L’examen de ce stagiaire n’est pas terminé.';
	end if;
	select * into e from examens_officiels where id = t.examen_id;

	return (
		with detail as (
			select eq.ordre, eq.enonce, eq.bonne_lettre, eq.regles, tr.lettre,
				(tr.lettre is not null and tr.lettre = eq.bonne_lettre) as juste
			from examen_questions eq
			left join tentative_reponses tr on tr.tentative_id = t.id and tr.question_id = eq.question_id
			where eq.examen_id = t.examen_id
		), manquees as (
			select r ->> 'reference' as reference, r ->> 'edition' as edition, r ->> 'titre' as titre, count(*)::int as erreurs
			from detail d, jsonb_array_elements(coalesce(d.regles, '[]'::jsonb)) r
			where not d.juste
			group by 1, 2, 3
		)
		select jsonb_build_object(
			'examen_id', e.id,
			'titre', e.titre,
			'date_heure', e.date_heure,
			'score', t.score,
			'total', t.total,
			'seuil', e.seuil_reussite,
			'reussi', t.reussi,
			'questions', coalesce((select jsonb_agg(jsonb_build_object(
				'ordre', ordre, 'enonce', enonce, 'lettre', lettre, 'bonne_lettre', bonne_lettre, 'juste', juste
			) order by ordre) from detail), '[]'::jsonb),
			'regles', coalesce((select jsonb_agg(jsonb_build_object(
				'reference', reference, 'edition', edition, 'titre', titre, 'erreurs', erreurs
			) order by erreurs desc, reference) from manquees), '[]'::jsonb)
		)
	);
end $$;

-- Bascule réserve → entraînement refusée tant qu'un examen non clos contient la question
-- (le stagiaire la verrait avant ou pendant l'examen). Reprend la version V1 + ce contrôle.
create or replace function public.enregistrer_question(p_id uuid, p_donnees jsonb, p_valider boolean) returns uuid
	language plpgsql security definer set search_path = public as $$
declare
	v_id uuid := p_id;
	v_prop jsonb;
	v_bonne uuid;
begin
	if not est_formateur() then
		raise exception 'Réservé aux formateurs.' using errcode = '42501';
	end if;
	if v_id is not null
		and coalesce(p_donnees ->> 'usage', 'entrainement') = 'entrainement'
		and exists (
			select 1 from examen_questions eq join examens_officiels e on e.id = eq.examen_id
			where eq.question_id = v_id and e.statut <> 'clos'
		) then
		raise exception 'Cette question fait partie d’un examen officiel qui n’est pas clos.';
	end if;
	if v_id is null then
		insert into questions (enonce, explication, auteur_id) values (p_donnees ->> 'enonce', coalesce(p_donnees ->> 'explication', ''), auth.uid())
		returning id into v_id;
	end if;

	update questions set
		enonce = p_donnees ->> 'enonce',
		explication = coalesce(p_donnees ->> 'explication', ''),
		theme_id = nullif(p_donnees ->> 'themeId', '')::uuid,
		niveau_id = nullif(p_donnees ->> 'niveauId', '')::uuid,
		role_cible = coalesce(p_donnees ->> 'roleCible', 'arbitre'),
		usage = coalesce(p_donnees ->> 'usage', 'entrainement'),
		video_url = nullif(p_donnees ->> 'videoUrl', ''),
		statut = case when p_valider then 'validee' else 'brouillon' end,
		valide_par = case when p_valider then auth.uid() end,
		valide_le = case when p_valider then now() end,
		a_relire = false
	where id = v_id;
	if not found then
		raise exception 'Question introuvable.';
	end if;

	for v_prop in select * from jsonb_array_elements(p_donnees -> 'propositions') loop
		insert into propositions (question_id, lettre, texte)
		values (v_id, v_prop ->> 'lettre', v_prop ->> 'texte')
		on conflict (question_id, lettre) do update set texte = excluded.texte;
	end loop;

	select id into v_bonne from propositions where question_id = v_id and lettre = p_donnees ->> 'bonne';
	if v_bonne is null then
		raise exception 'Bonne réponse manquante.';
	end if;
	insert into bonnes_reponses (question_id, proposition_id) values (v_id, v_bonne)
	on conflict (question_id) do update set proposition_id = excluded.proposition_id;

	delete from question_regles where question_id = v_id;
	insert into question_regles (question_id, regle_id, principale)
	select v_id, (x ->> 'id')::uuid, coalesce((x ->> 'principale')::boolean, false)
	from jsonb_array_elements(p_donnees -> 'regles') x;

	return v_id;
end $$;

-- Droits : les fonctions publiques aux comptes connectés, les fonctions internes à personne.
revoke execute on function public.composer_examen(uuid, uuid[]), public.ouvrir_examen(uuid), public.clore_examen(uuid),
	public.resultats_examen(uuid), public.detail_tentative(uuid) from public, anon;
grant execute on function public.composer_examen(uuid, uuid[]), public.ouvrir_examen(uuid), public.clore_examen(uuid),
	public.resultats_examen(uuid), public.detail_tentative(uuid) to authenticated;
revoke execute on function public.exiger_formateur(), public.examen_verrouille(uuid), public.finaliser_tentative(uuid)
	from public, anon, authenticated;
