-- Lot B « Séance pédagogique » :
--  - « Je ne sais pas » : réponse sans proposition, comptée comme une erreur, avec la correction complète ;
--  - explication facultative de chaque mauvaise proposition (propositions.explication) ;
--  - passage de la règle à surligner dans la correction (question_regles.passage) ;
--  - questions marquées par le stagiaire (« à revoir plus tard ») et séance à partir d'elles ;
--  - signalement d'un problème sur une question, lu et traité par les formateurs.

alter table public.propositions add column explication text;
alter table public.question_regles add column passage text;

-- Questions marquées : privées au stagiaire.
create table public.questions_marquees (
	stagiaire_id uuid not null default auth.uid() references public.profils (id) on delete cascade,
	question_id uuid not null references public.questions (id) on delete cascade,
	marquee_le timestamptz not null default now(),
	primary key (stagiaire_id, question_id)
);
alter table public.questions_marquees enable row level security;
create policy soi on public.questions_marquees for all to authenticated
	using (est_actif() and stagiaire_id = auth.uid()) with check (stagiaire_id = auth.uid());

-- Signalements : le stagiaire écrit et relit les siens ; les formateurs lisent et traitent tout.
create table public.signalements_question (
	id uuid primary key default gen_random_uuid(),
	question_id uuid not null references public.questions (id) on delete cascade,
	stagiaire_id uuid not null default auth.uid() references public.profils (id) on delete cascade,
	message text not null check (length(message) between 1 and 1000),
	cree_le timestamptz not null default now(),
	traite_le timestamptz,
	traite_par uuid references public.profils (id) on delete set null
);
create index signalements_question_idx on public.signalements_question (question_id, traite_le);
alter table public.signalements_question enable row level security;
create policy ecrire_soi on public.signalements_question for insert to authenticated
	with check (est_actif() and stagiaire_id = auth.uid());
create policy lire_soi on public.signalements_question for select to authenticated
	using (stagiaire_id = auth.uid());
create policy formateur on public.signalements_question for all to authenticated
	using (est_formateur()) with check (est_formateur());

-- Séance pédagogique faite des questions marquées (encore validées d'entraînement).
create function public.seance_marquees() returns uuid
	language plpgsql security definer set search_path = public as $$
declare
	v_id uuid;
	v_nb int;
begin
	if not est_actif() then
		raise exception 'Compte inactif.' using errcode = '42501';
	end if;
	insert into seances (stagiaire_id, type, nb_questions, filtre)
	values (auth.uid(), 'pedagogique', 1, jsonb_build_object('marquees', true))
	returning id into v_id;
	insert into seance_questions (seance_id, question_id, ordre)
	select v_id, q.id, row_number() over (order by random())
	from questions_marquees m
	join questions q on q.id = m.question_id
	where m.stagiaire_id = auth.uid() and q.statut = 'validee' and q.usage = 'entrainement';
	get diagnostics v_nb = row_count;
	if v_nb = 0 then
		delete from seances where id = v_id;
		raise exception 'Aucune question marquée.';
	end if;
	update seances set nb_questions = v_nb where id = v_id;
	return v_id;
end $$;
revoke execute on function public.seance_marquees() from public, anon;
grant execute on function public.seance_marquees() to authenticated;

-- Sources citées : avec le passage à surligner.
create or replace function public.sources_question(p_question uuid) returns jsonb
	language sql stable security definer set search_path = public as $$
	select coalesce(jsonb_agg(jsonb_build_object(
		'source', e.source, 'edition', e.libelle, 'reference', rg.reference,
		'texte', rg.texte, 'texte_original', rg.texte_original, 'principale', qr.principale, 'passage', qr.passage
	) order by qr.principale desc, rg.reference), '[]'::jsonb)
	from question_regles qr
	join regles rg on rg.id = qr.regle_id
	join editions e on e.id = rg.edition_id
	where qr.question_id = p_question;
$$;

-- valider_reponse : p_proposition null = « je ne sais pas » (mode pédagogique seulement).
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
	if p_proposition is not null and not exists (select 1 from propositions where id = p_proposition and question_id = p_question) then
		raise exception 'Proposition invalide.' using errcode = '42501';
	end if;
	select proposition_id into v_bonne from bonnes_reponses where question_id = p_question;

	if s.type = 'examen_entrainement' then
		if p_proposition is null then
			raise exception 'Proposition invalide.' using errcode = '42501';
		end if;
		v_fin := s.debut + make_interval(mins => s.duree_minutes);
		if p_repondu_le > v_fin
			or p_repondu_le < s.debut - interval '2 minutes'
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

	-- Mode pédagogique : la première réponse fait foi. « Je ne sais pas » = fausse, sans proposition.
	insert into reponses (seance_id, question_id, proposition_id, correcte)
	values (p_seance, p_question, p_proposition, coalesce(p_proposition = v_bonne, false))
	on conflict (seance_id, question_id) do update
		set proposition_id = coalesce(reponses.proposition_id, excluded.proposition_id),
			correcte = coalesce(reponses.correcte, excluded.correcte)
	returning * into r;

	return jsonb_build_object(
		'correcte', r.correcte,
		'sans_reponse', r.proposition_id is null,
		'proposition_id', r.proposition_id,
		'bonne_proposition_id', v_bonne,
		'explication', (select explication from questions where id = p_question),
		'explications_propositions', coalesce((select jsonb_object_agg(p.id, p.explication) from propositions p
			where p.question_id = p_question and p.id <> v_bonne and p.explication is not null and p.explication <> ''), '{}'::jsonb),
		'sources', sources_question(p_question)
	);
end $$;

-- enregistrer_question : explication par proposition et passage par règle (facultatifs).
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
		insert into propositions (question_id, lettre, texte, explication)
		values (v_id, v_prop ->> 'lettre', v_prop ->> 'texte', nullif(trim(coalesce(v_prop ->> 'explication', '')), ''))
		on conflict (question_id, lettre) do update set texte = excluded.texte, explication = excluded.explication;
	end loop;

	select id into v_bonne from propositions where question_id = v_id and lettre = p_donnees ->> 'bonne';
	if v_bonne is null then
		raise exception 'Bonne réponse manquante.';
	end if;
	insert into bonnes_reponses (question_id, proposition_id) values (v_id, v_bonne)
	on conflict (question_id) do update set proposition_id = excluded.proposition_id;

	delete from question_regles where question_id = v_id;
	insert into question_regles (question_id, regle_id, principale, passage)
	select v_id, (x ->> 'id')::uuid, coalesce((x ->> 'principale')::boolean, false), nullif(trim(coalesce(x ->> 'passage', '')), '')
	from jsonb_array_elements(p_donnees -> 'regles') x;

	return v_id;
end $$;
