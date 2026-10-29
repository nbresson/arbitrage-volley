<script lang="ts">
	import { page } from '$app/state';
	import { session } from '#lib/session.svelte.ts';
	import Icone, { type NomIcone } from './Icone.svelte';

	const liens = $derived<{ href: string; libelle: string; icone: NomIcone; actif: boolean }[]>([
		{ href: '/', libelle: 'Accueil', icone: 'accueil', actif: page.url.pathname === '/' },
		{ href: '/regles', libelle: 'Règles', icone: 'regles', actif: page.url.pathname.startsWith('/regles') },
		{
			href: '/entrainement/nouvelle',
			libelle: "S'entraîner",
			icone: 'sifflet',
			actif: page.url.pathname.startsWith('/entrainement') || page.url.pathname.startsWith('/examen-entrainement')
		},
		...(session.profil?.role === 'formateur'
			? [{ href: '/formateur/questions', libelle: 'Espace formateur', icone: 'stagiaires' as const, actif: page.url.pathname.startsWith('/formateur') }]
			: [])
	]);
</script>

{#each liens as l (l.href)}
	<a href={l.href} aria-current={l.actif ? 'page' : undefined}><Icone nom={l.icone} />{l.libelle}</a>
{/each}
