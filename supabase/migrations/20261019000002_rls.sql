-- Règles d'accès (Row Level Security).
-- Principe : un visiteur non connecté ne lit rien ; un compte désactivé ne lit rien ;
-- un stagiaire ne lit jamais une bonne réponse ni une question non validée ou réservée à l'examen ;
-- un formateur ne lit jamais les examens d'entraînement des stagiaires.
-- Les écritures des stagiaires passent par les fonctions de la migration « fonctions ».

-- Fonctions d'aide (security definer : lisent profils sans repasser par ses propres règles)
create function public.est_actif() returns boolean
	language sql stable security definer set search_path = public as $$
	select exists (select 1 from profils where id = auth.uid() and actif);
$$;

create function public.est_formateur() returns boolean
	language sql stable security definer set search_path = public as $$
	select exists (select 1 from profils where id = auth.uid() and actif and role = 'formateur');
$$;

-- Question visible d'un stagiaire : validée et d'entraînement
create function public.question_visible_stagiaire(q uuid) returns boolean
	language sql stable security definer set search_path = public as $$
	select exists (select 1 from questions where id = q and statut = 'validee' and usage = 'entrainement');
$$;

create function public.seance_pedagogique(s uuid) returns boolean
	language sql stable security definer set search_path = public as $$
	select exists (select 1 from seances where id = s and type = 'pedagogique');
$$;

create function public.seance_du_stagiaire(s uuid) returns boolean
	language sql stable security definer set search_path = public as $$
	select exists (select 1 from seances where id = s and stagiaire_id = auth.uid());
$$;

alter table public.editions enable row level security;
alter table public.regles enable row level security;
alter table public.themes enable row level security;
alter table public.niveaux enable row level security;
alter table public.profils enable row level security;
alter table public.questions enable row level security;
alter table public.propositions enable row level security;
alter table public.bonnes_reponses enable row level security;
alter table public.question_regles enable row level security;
alter table public.seances enable row level security;
alter table public.seance_questions enable row level security;
alter table public.reponses enable row level security;

-- Référentiel : lecture par tout compte actif, écriture par les formateurs
create policy lecture on public.editions for select to authenticated using (est_actif());
create policy ecriture on public.editions for all to authenticated using (est_formateur()) with check (est_formateur());
create policy lecture on public.regles for select to authenticated using (est_actif());
create policy ecriture on public.regles for all to authenticated using (est_formateur()) with check (est_formateur());
create policy lecture on public.themes for select to authenticated using (est_actif());
create policy ecriture on public.themes for all to authenticated using (est_formateur()) with check (est_formateur());
create policy lecture on public.niveaux for select to authenticated using (est_actif());
create policy ecriture on public.niveaux for all to authenticated using (est_formateur()) with check (est_formateur());

-- Profils : chacun lit le sien (même désactivé, pour que l'application l'en informe) ; formateurs : tous
create policy lecture_soi on public.profils for select to authenticated using (id = auth.uid());
create policy lecture_formateur on public.profils for select to authenticated using (est_formateur());
create policy modif_soi on public.profils for update to authenticated using (id = auth.uid() and est_actif()) with check (id = auth.uid());
create policy modif_formateur on public.profils for update to authenticated using (est_formateur()) with check (est_formateur());

-- Un stagiaire ne peut changer que la date d'acceptation de la notice sur son propre profil.
create function public.proteger_profil() returns trigger
	language plpgsql security definer set search_path = public as $$
begin
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
create trigger profils_proteger before update on public.profils for each row execute function public.proteger_profil();

-- Questions et propositions
create policy lecture_stagiaire on public.questions for select to authenticated
	using (est_actif() and statut = 'validee' and usage = 'entrainement');
create policy tout_formateur on public.questions for all to authenticated using (est_formateur()) with check (est_formateur());

create policy lecture_stagiaire on public.propositions for select to authenticated
	using (est_actif() and question_visible_stagiaire(question_id));
create policy tout_formateur on public.propositions for all to authenticated using (est_formateur()) with check (est_formateur());

create policy tout_formateur on public.bonnes_reponses for all to authenticated using (est_formateur()) with check (est_formateur());

create policy lecture_stagiaire on public.question_regles for select to authenticated
	using (est_actif() and question_visible_stagiaire(question_id));
create policy tout_formateur on public.question_regles for all to authenticated using (est_formateur()) with check (est_formateur());

-- Séances : le stagiaire lit les siennes ; le formateur lit les séances pédagogiques uniquement.
-- Aucune écriture directe : creer_seance, valider_reponse, etc. (security definer).
create policy lecture_soi on public.seances for select to authenticated using (est_actif() and stagiaire_id = auth.uid());
create policy lecture_formateur on public.seances for select to authenticated using (est_formateur() and type = 'pedagogique');

create policy lecture_soi on public.seance_questions for select to authenticated using (est_actif() and seance_du_stagiaire(seance_id));
create policy lecture_formateur on public.seance_questions for select to authenticated using (est_formateur() and seance_pedagogique(seance_id));

create policy lecture_soi on public.reponses for select to authenticated using (est_actif() and seance_du_stagiaire(seance_id));
create policy lecture_formateur on public.reponses for select to authenticated using (est_formateur() and seance_pedagogique(seance_id));

-- Rien pour le rôle « anon » : sans politique, il ne lit ni n'écrit rien.
revoke all on all tables in schema public from anon;
