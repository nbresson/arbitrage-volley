import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Site statique en mode SPA : toutes les routes retombent sur index.html.
			adapter: adapter({ fallback: 'index.html' })
		})
	],
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					include: ['tests/unit/**/*.test.ts'],
					environment: 'jsdom',
					setupFiles: ['tests/setup-unit.ts']
				},
				resolve: { conditions: ['browser'] }
			},
			{
				extends: true,
				test: {
					name: 'integration',
					include: ['tests/integration/**/*.test.ts'],
					environment: 'node',
					testTimeout: 30000,
					fileParallelism: false
				}
			}
		]
	}
});
