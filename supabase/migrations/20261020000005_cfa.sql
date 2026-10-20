-- Consignes CFA saisies par les formateurs (spec § 9.3) : activation d'une édition et protection des consignes citées.

-- Active une édition et désactive les autres éditions de la même source. Les questions validées liées à une règle
-- d'une édition désactivée passent « à relire » (même règle que le chargeur, scripts/import/charger.ts).
-- Renvoie le nombre de questions marquées.
create function public.activer_edition(p_edition uuid) returns int
	language plpgsql security definer set search_path = public as $$
declare
	v_source text;
	v_nb int;
begin
	perform exiger_formateur();
	select source into v_source from editions where id = p_edition;
	if not found then
		raise exception 'Édition introuvable.';
	end if;
	update editions set active = (id = p_edition) where source = v_source;
	update questions q set a_relire = true
	where q.statut = 'validee'
		and not q.a_relire
		and exists (
			select 1 from question_regles qr
			join regles rg on rg.id = qr.regle_id
			join editions e on e.id = rg.edition_id
			where qr.question_id = q.id and e.source = v_source and not e.active
		);
	get diagnostics v_nb = row_count;
	return v_nb;
end $$;

revoke execute on function public.activer_edition(uuid) from public, anon;
grant execute on function public.activer_edition(uuid) to authenticated;

-- Une correction ne s'affiche jamais sans sa source : on ne supprime pas une règle citée par une question validée.
create function public.proteger_regle_citee() returns trigger
	language plpgsql security definer set search_path = public as $$
begin
	if exists (
		select 1 from question_regles qr join questions q on q.id = qr.question_id
		where qr.regle_id = old.id and q.statut = 'validee'
	) then
		raise exception 'Cette consigne est citée par une question validée : retirez-la d’abord de la question.';
	end if;
	return old;
end $$;
create trigger regles_proteger_citee before delete on public.regles for each row execute function public.proteger_regle_citee();
