<script lang="ts">
	import { page } from '$app/state';
	const liens = $derived([
		{ href: '/formateur/questions', libelle: 'Questions', actif: page.url.pathname.startsWith('/formateur/questions') },
		{ href: '/formateur/stagiaires', libelle: 'Stagiaires', actif: page.url.pathname.startsWith('/formateur/stagiaires') },
		{ href: '/regles', libelle: 'Règles', actif: false },
		{ href: '/', libelle: 'Espace stagiaire', actif: false }
	]);
</script>

{#each liens as l (l.href)}
	<a href={l.href} aria-current={l.actif ? 'page' : undefined}>{l.libelle}</a>
{/each}
