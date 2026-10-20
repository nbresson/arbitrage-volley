<script lang="ts">
	import { page } from '$app/state';
	const liens = $derived([
		{ href: '/formateur/stagiaires', libelle: 'Stagiaires', actif: page.url.pathname.startsWith('/formateur/stagiaires') },
		{ href: '/formateur/examens', libelle: 'Examens officiels', actif: page.url.pathname.startsWith('/formateur/examens') },
		{ href: '/formateur/questions', libelle: 'Questions', actif: page.url.pathname.startsWith('/formateur/questions') },
		{ href: '/formateur/regles', libelle: 'Règles', actif: page.url.pathname.startsWith('/formateur/regles') },
		{ href: '/', libelle: 'Espace stagiaire', actif: false }
	]);
</script>

{#each liens as l (l.href)}
	<a href={l.href} aria-current={l.actif ? 'page' : undefined}>{l.libelle}</a>
{/each}
