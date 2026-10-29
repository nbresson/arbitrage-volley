import { render } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Icone, { NOMS_ICONES } from '../../src/lib/components/Icone.svelte';

test('chaque icône est un SVG décoratif au trait, sans texte', () => {
	for (const nom of NOMS_ICONES) {
		const { container, unmount } = render(Icone, { nom });
		const svg = container.querySelector('svg');
		expect(svg, nom).not.toBeNull();
		expect(svg?.getAttribute('aria-hidden')).toBe('true');
		expect(svg?.getAttribute('stroke')).toBe('currentColor');
		expect(svg?.children.length, nom).toBeGreaterThan(0);
		unmount();
	}
});

test('la taille se règle', () => {
	const { container } = render(Icone, { nom: 'ballon', taille: 28 });
	expect(container.querySelector('svg')?.getAttribute('width')).toBe('28');
});
