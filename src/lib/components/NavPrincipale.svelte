<script lang="ts">
	import { page } from '$app/state';
	import { session } from '#lib/session.svelte.ts';

	const liens = $derived([
		{ href: '/', libelle: 'Accueil', actif: page.url.pathname === '/' },
		{ href: '/regles', libelle: 'Règles', actif: page.url.pathname.startsWith('/regles') },
		{
			href: '/entrainement/nouvelle',
			libelle: "S'entraîner",
			actif: page.url.pathname.startsWith('/entrainement') || page.url.pathname.startsWith('/examen-entrainement')
		},
		...(session.profil?.role === 'formateur'
			? [{ href: '/formateur/questions', libelle: 'Espace formateur', actif: page.url.pathname.startsWith('/formateur') }]
			: [])
	]);
</script>

{#each liens as l (l.href)}
	<a href={l.href} aria-current={l.actif ? 'page' : undefined}>{l.libelle}</a>
{/each}
