import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

// Vitest tourne sans globals : le nettoyage automatique du DOM doit être branché à la main.
afterEach(() => cleanup());
