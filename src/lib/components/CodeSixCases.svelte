<script lang="ts">
	// Code d'accès en six cases : un chiffre par case, pavé numérique sur téléphone, collage d'un code entier accepté.
	import { saisirChiffres } from '#lib/examen-officiel/salle.ts';

	let { valeur = $bindable(''), libelle, idDescription, desactive = false }: { valeur?: string; libelle: string; idDescription?: string; desactive?: boolean } = $props();

	// svelte-ignore state_referenced_locally
	let cases = $state(Array.from({ length: 6 }, (_, i) => valeur[i] ?? ''));
	const champs: HTMLInputElement[] = [];

	function appliquer(i: number, saisie: string) {
		const r = saisirChiffres(cases, i, saisie);
		cases = r.cases;
		valeur = cases.join('');
		champs[r.focus]?.focus();
		champs[r.focus]?.select();
	}

	// Une case déjà remplie qui reçoit un chiffre contient les deux : on garde le nouveau. Un code entier (saisie automatique) passe tel quel.
	const nouvelleSaisie = (v: string, ancien: string) => (ancien && v.length === 2 && v.includes(ancien) ? v.replace(ancien, '') : v);

	function touche(i: number, e: KeyboardEvent) {
		if (e.key === 'Backspace' && !cases[i] && i > 0) {
			e.preventDefault();
			appliquer(i - 1, '');
		} else if (e.key === 'ArrowLeft' && i > 0) champs[i - 1].focus();
		else if (e.key === 'ArrowRight' && i < 5) champs[i + 1].focus();
	}

	function coller(i: number, e: ClipboardEvent) {
		e.preventDefault();
		appliquer(i, e.clipboardData?.getData('text') ?? '');
	}
</script>

<div class="code" role="group" aria-label={libelle} aria-describedby={idDescription}>
	{#each cases as c, i (i)}
		<input
			bind:this={champs[i]}
			value={c}
			inputmode="numeric"
			autocomplete={i === 0 ? 'one-time-code' : 'off'}
			maxlength="6"
			aria-label="Chiffre {i + 1} sur 6"
			disabled={desactive}
			oninput={(e) => appliquer(i, nouvelleSaisie(e.currentTarget.value, c))}
			onkeydown={(e) => touche(i, e)}
			onpaste={(e) => coller(i, e)}
			onfocus={(e) => e.currentTarget.select()}
		/>
		{#if i === 2}<span class="tiret" aria-hidden="true">–</span>{/if}
	{/each}
</div>

<style>
	.code {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	input {
		width: 52px;
		height: 64px;
		padding: 0;
		text-align: center;
		font-family: var(--police-chiffres);
		font-weight: 800;
		font-size: 32px;
		font-variant-numeric: tabular-nums;
		color: var(--encre);
		background: var(--papier);
		border: 1.5px solid var(--filet);
		border-radius: var(--r);
	}
	input:focus-visible {
		border-color: var(--tableau);
		outline: 3px solid var(--bleu);
		outline-offset: 1px;
	}
	.tiret {
		font-weight: 800;
		color: var(--doux);
	}
	@media (max-width: 420px) {
		input {
			width: 42px;
			height: 54px;
			font-size: 26px;
		}
		.code {
			gap: 5px;
		}
	}
</style>
