-- Lien direct tentative → examen (en plus du lien vers l'inscription), pour que la fiche stagiaire
-- puisse lire une tentative avec le titre et la date de son examen en une requête.
alter table public.tentatives
	add constraint tentatives_examen_id_fkey foreign key (examen_id) references public.examens_officiels (id) on delete restrict;
