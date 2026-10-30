// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
	/** Version affichée dans le pied de page (package.json, plus le commit compilé quand il est connu). */
	const __VERSION__: string;
	/** Date de compilation (ISO), affichée comme « mise à jour le … ». */
	const __DATE_MAJ__: string;
}

export {};
