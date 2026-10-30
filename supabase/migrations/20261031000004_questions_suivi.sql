-- Lot H : formateur, questions et contenu.

-- 1. Historique des modifications d'une question : qui, quand, quoi (champs modifiés, en mots).
create table public.questions_historique (
	id bigint generated always as identity primary key,
	question_id uuid not null references public.questions (id) on delete cascade,
	auteur_id uuid references public.profils (id) on delete set null,
	quand timestamptz not null default now(),
	resume text not null
);
create index questions_historique_question_idx on public.questions_historique (question_id, quand desc);
alter table public.questions_historique enable row level security;
create policy lecture_formateur on public.questions_historique for select to authenticated using (est_formateur());

create function public.historiser_question() returns trigger
	language plpgsql security definer set search_path = public as $$
declare
	v_champs text[] := '{}';
begin
	if tg_op = 'INSERT' then
		insert into questions_historique (question_id, auteur_id, resume) values (new.id, auth.uid(), 'Création');
		return new;
	end if;
	-- La création remplit tous les champs dans la même transaction : la ligne « Création » suffit.
	if exists (select 1 from questions_historique where question_id = new.id and quand = now() and resume = 'Création') then
		return new;
	end if;
	if new.enonce is distinct from old.enonce then v_champs := array_append(v_champs, 'énoncé'); end if;
	if new.explication is distinct from old.explication then v_champs := array_append(v_champs, 'explication'); end if;
	if new.theme_id is distinct from old.theme_id then v_champs := array_append(v_champs, 'thème'); end if;
	if new.niveau_id is distinct from old.niveau_id then v_champs := array_append(v_champs, 'niveau'); end if;
	if new.role_cible is distinct from old.role_cible then v_champs := array_append(v_champs, 'rôle visé'); end if;
	if new.usage is distinct from old.usage then v_champs := array_append(v_champs, 'usage'); end if;
	if new.video_url is distinct from old.video_url then v_champs := array_append(v_champs, 'vidéo'); end if;
	if new.statut is distinct from old.statut then
		v_champs := array_append(v_champs, case new.statut when 'validee' then 'validée' when 'brouillon' then 'repassée en brouillon' else 'archivée' end);
	end if;
	if cardinality(v_champs) > 0 then
		insert into questions_historique (question_id, auteur_id, resume) values (new.id, auth.uid(), array_to_string(v_champs, ', '));
	end if;
	return new;
end $$;
create trigger questions_historiser after insert or update on public.questions
	for each row execute function public.historiser_question();

create function public.historiser_proposition() returns trigger
	language plpgsql security definer set search_path = public as $$
begin
	if tg_op = 'UPDATE' and new.texte is not distinct from old.texte and new.explication is not distinct from old.explication then
		return new;
	end if;
	-- Une seule ligne par enregistrement : on complète celle que la question vient d'écrire dans la même transaction.
	update questions_historique set resume = resume || ', proposition ' || new.lettre
	where id = (
		select id from questions_historique
		where question_id = new.question_id and quand = now() and resume <> 'Création'
			and resume not like ('%proposition ' || new.lettre || '%')
		order by id desc limit 1
	);
	if not found and tg_op = 'UPDATE'
		and not exists (select 1 from questions_historique where question_id = new.question_id and quand = now()) then
		insert into questions_historique (question_id, auteur_id, resume) values (new.question_id, auth.uid(), 'proposition ' || new.lettre);
	end if;
	return new;
end $$;
create trigger propositions_historiser after insert or update on public.propositions
	for each row execute function public.historiser_proposition();

-- 2. Taux de réussite de chaque question en mode pédagogique (tri de la banque, repérage des questions mal posées).
create function public.taux_questions()
returns table (question_id uuid, reponses int, justes int)
	language plpgsql stable security definer set search_path = public as $$
begin
	perform exiger_formateur();
	return query
	select r.question_id, count(*)::int, count(*) filter (where r.correcte)::int
	from reponses r
	join seances s on s.id = r.seance_id
	where s.type = 'pedagogique' and r.correcte is not null
	group by r.question_id;
end $$;
revoke execute on function public.taux_questions() from public, anon;
grant execute on function public.taux_questions() to authenticated;
