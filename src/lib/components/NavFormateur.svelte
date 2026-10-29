<script lang="ts">
	import { page } from '$app/state';
	import Icone, { type NomIcone } from './Icone.svelte';

	const liens = $derived<{ href: string; libelle: string; icone: NomIcone; actif: boolean }[]>([
		{ href: '/formateur/stagiaires', libelle: 'Stagiaires', icone: 'stagiaires', actif: page.url.pathname.startsWith('/formateur/stagiaires') },
		{ href: '/formateur/examens', libelle: 'Examens officiels', icone: 'chrono', actif: page.url.pathname.startsWith('/formateur/examens') },
		{ href: '/formateur/questions', libelle: 'Questions', icone: 'questions', actif: page.url.pathname.startsWith('/formateur/questions') },
		{ href: '/formateur/regles', libelle: 'Règles', icone: 'regles', actif: page.url.pathname.startsWith('/formateur/regles') },
		{ href: '/', libelle: 'Espace stagiaire', icone: 'accueil', actif: false }
	]);
</script>

{#each liens as l (l.href)}
	<a href={l.href} aria-current={l.actif ? 'page' : undefined}><Icone nom={l.icone} />{l.libelle}</a>
{/each}
