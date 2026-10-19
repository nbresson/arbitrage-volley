-- Référentiel de départ (idempotent). Niveaux provisoires, thèmes = rubriques du Casebook (à ajuster par le comité).

insert into public.editions (source, libelle, active) values
	('fivb_regles', 'Règles officielles 2025-2028', true),
	('casebook', 'Casebook 2025', true)
on conflict (libelle) do nothing;

insert into public.niveaux (libelle, ordre) values
	('Niveau 1', 1),
	('Niveau 2', 2),
	('Niveau 3', 3)
on conflict (libelle) do nothing;

insert into public.themes (libelle, ordre) values
	('Objets interdits', 1),
	('Capitaine', 2),
	('Entraîneur, entraîneur adjoint', 3),
	('L''uniforme', 4),
	('Fautes de position et de rotation', 5),
	('Jouer le ballon', 6),
	('Pénétration sous le filet', 7),
	('Joueur au filet', 8),
	('Service', 9),
	('Frappe d''attaque', 10),
	('Contre', 11),
	('Remplacements', 12),
	('Temps-morts', 13),
	('Demandes non fondées', 14),
	('Blessures', 15),
	('Retards de jeu', 16),
	('Interventions extérieures', 17),
	('Le Libéro', 18),
	('Conduite des participants', 19),
	('Les arbitres et leurs responsabilités', 20),
	('Cas particuliers', 21),
	('Cas d''utilisation de la technologie', 22)
on conflict (libelle) do nothing;
