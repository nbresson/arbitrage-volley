import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Version visible dans le pied de page : celle de package.json et, si on la connaît, le commit compilé.
const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string;
let commit = process.env.WORKERS_CI_COMMIT_SHA?.slice(0, 7) ?? '';
if (!commit) {
	try {
		commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
	} catch {
		commit = '';
	}
}

export default defineConfig({
	// Seules les variables PUBLIC_* de .env.local sont exposées au navigateur (import.meta.env).
	envPrefix: 'PUBLIC_',
	define: {
		__VERSION__: JSON.stringify(commit ? `${version} (${commit})` : version),
		__DATE_MAJ__: JSON.stringify(new Date().toISOString())
	},
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
