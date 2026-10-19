-- Fonctions de séance, appelées depuis le navigateur (supabase.rpc).
-- Elles s'exécutent avec les droits du propriétaire (security definer) et vérifient elles-mêmes
-- l'identité de l'appelant : c'est ici, et non dans le navigateur, que la bonne réponse est protégée.

-- Bilan d'un examen d'entraînement, calculé à la fin (les réponses d'examen ne portent pas de correction).
alter table public.seances add column resultat jsonb;

-- Séance de l'appelant, verrouillée ; erreur sinon.
create function public.ma_seance(p_seance uuid) returns public.seances
	language plpgsql security definer set search_path = public as $$
declare
	s seances;
begin
	if not est_actif() then
		raise exception 'Compte inactif.' using errcode = '42501';
	end if;
	select * into s from seances where id = p_seance and stagiaire_id = auth.uid() for update;
	if not found then
		raise exception 'Séance introuvable.' using errcode = '42501';
	end if;
	return s;
end $$;

create function public.creer_seance(
	p_type text,
	p_theme_ids uuid[],
	p_regle_id uuid,
	p_niveau_id uuid,
	p_role text,
	p_nb int,
	p_duree_minutes int
) returns uuid
	language plpgsql security definer set search_path = public as $$
declare
	v_id uuid;
	v_nb int;
begin
	if not est_actif() then
		raise exception 'Compte inactif.' using errcode = '42501';
	end if;
	if p_type not in ('pedagogique', 'examen_entrainement') then
		raise exception 'Type de séance inconnu.';
	end if;
	insert into seances (stagiaire_id, type, nb_questions, duree_minutes, filtre)
	values (
		auth.uid(),
		p_type,
		least(greatest(coalesce(p_nb, 20), 1), 50),
		case when p_type = 'examen_entrainement' then least(greatest(coalesce(p_duree_minutes, 45), 1), 240) end,
		jsonb_build_object('themes', p_theme_ids, 'regle', p_regle_id, 'niveau', p_niveau_id, 'role', p_role)
	)
	returning id into v_id;

	insert into seance_questions (seance_id, question_id, ordre)
	select v_id, q.id, row_number() over (order by random())
	from questions q
	where q.statut = 'validee'
		and q.usage = 'entrainement'
		and (p_theme_ids is null or cardinality(p_theme_ids) = 0 or q.theme_id = any (p_theme_ids))
		and (p_niveau_id is null or q.niveau_id = p_niveau_id)
		and (p_role is null or q.role_cible in (p_role, 'les_deux'))
		and (p_regle_id is null or exists (select 1 from question_regles qr where qr.question_id = q.id and qr.regle_id = p_regle_id))
	order by random()
	limit least(greatest(coalesce(p_nb, 20), 1), 50);

	get diagnostics v_nb = row_count;
	if v_nb = 0 then
		raise exception 'Aucune question ne correspond à ces critères.';
	end if;
	update seances set nb_questions = v_nb where id = v_id;
	return v_id;
end $$;

create function public.questions_de_seance(p_seance uuid)
returns table (
	ordre int,
	question_id uuid,
	enonce text,
	theme text,
	niveau text,
	role_cible text,
	video_url text,
	propositions jsonb,
	deja_repondue boolean,
	correcte_precedente boolean,
	proposition_choisie uuid,
	signalee boolean
)
	language plpgsql security definer set search_path = public as $$
declare
	s seances;
begin
	select * into s from seances where id = p_seance and stagiaire_id = auth.uid();
	if not found or not est_actif() then
		raise exception 'Séance introuvable.' using errcode = '42501';
	end if;
	return query
	select
		sq.ordre,
		q.id,
		q.enonce,
		t.libelle,
		n.libelle,
		q.role_cible,
		q.video_url,
		(select jsonb_agg(jsonb_build_object('id', p.id, 'lettre', p.lettre, 'texte', p.texte) order by p.lettre)
		 from propositions p where p.question_id = q.id),
		r.proposition_id is not null,
		case when s.type = 'pedagogique' then r.correcte end,
		r.proposition_id,
		coalesce(r.signalee, false)
	from seance_questions sq
	join questions q on q.id = sq.question_id
	left join themes t on t.id = q.theme_id
	left join niveaux n on n.id = q.niveau_id
	left join reponses r on r.seance_id = sq.seance_id and r.question_id = sq.question_id
	where sq.seance_id = p_seance
	order by sq.ordre;
end $$;

-- Sources citées d'une question (règles FIVB, cas du Casebook, consignes CFA)
create function public.sources_question(p_question uuid) returns jsonb
	language sql stable security definer set search_path = public as $$
	select coalesce(jsonb_agg(jsonb_build_object(
		'source', e.source, 'edition', e.libelle, 'reference', rg.reference,
		'texte', rg.texte, 'texte_original', rg.texte_original, 'principale', qr.principale
	) order by qr.principale desc, rg.reference), '[]'::jsonb)
	from question_regles qr
	join regles rg on rg.id = qr.regle_id
	join editions e on e.id = rg.edition_id
	where qr.question_id = p_question;
$$;

create function public.valider_reponse(p_seance uuid, p_question uuid, p_proposition uuid, p_repondu_le timestamptz default now())
returns jsonb
	language plpgsql security definer set search_path = public as $$
declare
	s seances;
	v_bonne uuid;
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
		-- Heure de réponse : celle du navigateur (réponses gardées hors ligne), jamais dans le futur.
		if least(p_repondu_le, now()) > s.debut + make_interval(mins => s.duree_minutes)
			or p_repondu_le > now() + interval '2 minutes' then
			raise exception 'Le temps de l’examen est écoulé.';
		end if;
		insert into reponses (seance_id, question_id, proposition_id, correcte, repondu_le)
		values (p_seance, p_question, p_proposition, null, least(p_repondu_le, now()))
		on conflict (seance_id, question_id)
		do update set proposition_id = excluded.proposition_id, repondu_le = excluded.repondu_le;
		return jsonb_build_object('enregistree', true);
	end if;

	-- Mode pédagogique : la première réponse fait foi (double clic, renvoi après coupure).
	insert into reponses (seance_id, question_id, proposition_id, correcte)
	values (p_seance, p_question, p_proposition, p_proposition = v_bonne)
	on conflict (seance_id, question_id) do update
		set proposition_id = coalesce(reponses.proposition_id, excluded.proposition_id),
			correcte = coalesce(reponses.correcte, excluded.correcte)
	returning * into r;

	return jsonb_build_object(
		'correcte', r.correcte,
		'bonne_proposition_id', v_bonne,
		'explication', (select explication from questions where id = p_question),
		'sources', sources_question(p_question)
	);
end $$;

create function public.signaler_question(p_seance uuid, p_question uuid, p_signalee boolean) returns void
	language plpgsql security definer set search_path = public as $$
declare
	s seances;
begin
	s := ma_seance(p_seance);
	if s.fin is not null then
		raise exception 'Cette séance est terminée.';
	end if;
	if not exists (select 1 from seance_questions where seance_id = p_seance and question_id = p_question) then
		raise exception 'Question absente de la séance.' using errcode = '42501';
	end if;
	insert into reponses (seance_id, question_id, signalee)
	values (p_seance, p_question, p_signalee)
	on conflict (seance_id, question_id) do update set signalee = excluded.signalee;
end $$;

create function public.terminer_seance(p_seance uuid) returns jsonb
	language plpgsql security definer set search_path = public as $$
declare
	s seances;
	v_bilan jsonb;
begin
	s := ma_seance(p_seance);
	if s.resultat is not null then
		return s.resultat;
	end if;

	with detail as (
		select q.theme_id, t.libelle as theme, coalesce(t.ordre, 0) as ordre_theme,
			(r.proposition_id is not null and r.proposition_id = br.proposition_id) as juste
		from seance_questions sq
		join questions q on q.id = sq.question_id
		left join themes t on t.id = q.theme_id
		left join bonnes_reponses br on br.question_id = sq.question_id
		left join reponses r on r.seance_id = sq.seance_id and r.question_id = sq.question_id
		where sq.seance_id = p_seance
	), par_theme as (
		select theme_id, theme, ordre_theme, count(*) filter (where juste) as justes, count(*) as total
		from detail group by theme_id, theme, ordre_theme
	)
	select jsonb_build_object(
		'score', (select count(*) filter (where juste) from detail),
		'total', (select count(*) from detail),
		'par_theme', coalesce((select jsonb_agg(jsonb_build_object('theme_id', theme_id, 'theme', coalesce(theme, 'Sans thème'), 'justes', justes, 'total', total) order by ordre_theme, theme) from par_theme), '[]'::jsonb)
	) into v_bilan;

	update seances set fin = coalesce(fin, now()), resultat = v_bilan where id = p_seance;
	return v_bilan;
end $$;

create function public.avancement(p_stagiaire uuid default auth.uid())
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
	left join dernieres d on d.question_id = q.id
	group by t.id, t.libelle, t.ordre
	order by t.ordre;
end $$;

-- Enregistrement atomique d'une question par un formateur (question, propositions, bonne réponse, règles).
create function public.enregistrer_question(p_id uuid, p_donnees jsonb, p_valider boolean) returns uuid
	language plpgsql security definer set search_path = public as $$
declare
	v_id uuid := p_id;
	v_prop jsonb;
	v_bonne uuid;
begin
	if not est_formateur() then
		raise exception 'Réservé aux formateurs.' using errcode = '42501';
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

-- Seuls les comptes connectés peuvent appeler ces fonctions.
revoke execute on function public.creer_seance, public.questions_de_seance, public.valider_reponse,
	public.signaler_question, public.terminer_seance, public.avancement, public.enregistrer_question,
	public.ma_seance, public.sources_question from public, anon;
grant execute on function public.creer_seance, public.questions_de_seance, public.valider_reponse,
	public.signaler_question, public.terminer_seance, public.avancement, public.enregistrer_question to authenticated;
