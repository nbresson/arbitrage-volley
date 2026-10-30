-- Revue UX (n° 12) : le bilan d'une séance liste ses questions ratées depuis la base,
-- pour qu'une reprise ou un rechargement ne vide pas la liste.
create function public.erreurs_de_seance(p_seance uuid)
returns table (question_id uuid, enonce text, source jsonb)
	language plpgsql stable security definer set search_path = public as $$
begin
	if not est_actif() or not exists (select 1 from seances where id = p_seance and stagiaire_id = auth.uid()) then
		raise exception 'Séance introuvable.' using errcode = '42501';
	end if;
	return query
	select q.id, q.enonce,
		(select jsonb_build_object('source', e.source, 'edition', e.libelle, 'reference', rg.reference,
			'texte', rg.texte, 'texte_original', rg.texte_original, 'principale', qr.principale)
		 from question_regles qr
		 join regles rg on rg.id = qr.regle_id
		 join editions e on e.id = rg.edition_id
		 where qr.question_id = q.id
		 order by qr.principale desc, rg.reference
		 limit 1)
	from reponses r
	join questions q on q.id = r.question_id
	join seance_questions sq on sq.seance_id = r.seance_id and sq.question_id = r.question_id
	where r.seance_id = p_seance and r.correcte = false
	order by sq.ordre;
end $$;
revoke execute on function public.erreurs_de_seance(uuid) from public, anon;
grant execute on function public.erreurs_de_seance(uuid) to authenticated;
