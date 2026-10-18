import { describe, expect, test } from 'vitest';
import { creerFile, type ReponseEnAttente } from '../../src/lib/seance/file-hors-ligne';

class StockageMemoire implements Storage {
	private m = new Map<string, string>();
	get length() {
		return this.m.size;
	}
	clear() {
		this.m.clear();
	}
	getItem(k: string) {
		return this.m.get(k) ?? null;
	}
	key(i: number) {
		return [...this.m.keys()][i] ?? null;
	}
	removeItem(k: string) {
		this.m.delete(k);
	}
	setItem(k: string, v: string) {
		this.m.set(k, v);
	}
}

const r = (questionId: string, propositionId: string, reponduLe = '2026-10-18T10:00:00Z'): ReponseEnAttente => ({
	seanceId: 's1',
	questionId,
	propositionId,
	reponduLe
});

describe('file de réponses hors ligne', () => {
	test('deux réponses à la même question : une seule entrée, la dernière', () => {
		const f = creerFile(new StockageMemoire(), 'file-s1');
		f.ajouter(r('q1', 'A'));
		f.ajouter(r('q1', 'C'));
		expect(f.lister()).toEqual([r('q1', 'C')]);
	});

	test('l’ordre des questions est conservé', () => {
		const f = creerFile(new StockageMemoire(), 'file-s1');
		f.ajouter(r('q1', 'A'));
		f.ajouter(r('q2', 'B'));
		f.ajouter(r('q1', 'D'));
		expect(f.lister().map((x) => x.questionId)).toEqual(['q2', 'q1']);
	});

	test('vider envoie dans l’ordre et s’arrête au premier échec, sans rien perdre', async () => {
		const f = creerFile(new StockageMemoire(), 'file-s1');
		['q1', 'q2', 'q3'].forEach((q) => f.ajouter(r(q, 'A')));
		const envoyees: string[] = [];
		const bilan = await f.vider(async (x) => {
			if (x.questionId === 'q2') throw new Error('réseau');
			envoyees.push(x.questionId);
		});
		expect(bilan).toEqual({ envoyees: 1, restantes: 2 });
		expect(envoyees).toEqual(['q1']);
		expect(f.lister().map((x) => x.questionId)).toEqual(['q2', 'q3']);
	});

	test('vider complètement laisse la file vide', async () => {
		const f = creerFile(new StockageMemoire(), 'file-s1');
		f.ajouter(r('q1', 'A'));
		expect(await f.vider(async () => {})).toEqual({ envoyees: 1, restantes: 0 });
		expect(f.lister()).toEqual([]);
	});

	test('la file survit à un rechargement (même stockage)', () => {
		const s = new StockageMemoire();
		creerFile(s, 'file-s1').ajouter(r('q1', 'A'));
		expect(creerFile(s, 'file-s1').lister()).toEqual([r('q1', 'A')]);
	});

	test('un stockage corrompu donne une file vide au lieu de planter', () => {
		const s = new StockageMemoire();
		s.setItem('file-s1', '{pas du json');
		expect(creerFile(s, 'file-s1').lister()).toEqual([]);
	});
});
