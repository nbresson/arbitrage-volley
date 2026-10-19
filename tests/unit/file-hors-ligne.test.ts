import { describe, expect, test } from 'vitest';
import { creerFile, RefusDefinitif, type ReponseEnAttente } from '../../src/lib/seance/file-hors-ligne';

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
		expect(bilan).toMatchObject({ envoyees: 1, restantes: 2 });
		expect(envoyees).toEqual(['q1']);
		expect(f.lister().map((x) => x.questionId)).toEqual(['q2', 'q3']);
	});

	test('vider complètement laisse la file vide', async () => {
		const f = creerFile(new StockageMemoire(), 'file-s1');
		f.ajouter(r('q1', 'A'));
		expect(await f.vider(async () => {})).toMatchObject({ envoyees: 1, restantes: 0 });
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

describe('file hors ligne : corrections de la revue', () => {
	test('deux vidages simultanés sont enchaînés : rien n’est envoyé deux fois', async () => {
		const f = creerFile(new StockageMemoire(), 'file-s1');
		f.ajouter(r('q1', 'A'));
		const envoyees: string[] = [];
		let liberer!: () => void;
		const attente = new Promise<void>((ok) => (liberer = ok));
		const envoyer = async (x: ReponseEnAttente) => {
			if (x.questionId === 'q1' && !envoyees.length) await attente;
			envoyees.push(x.questionId);
		};
		const v1 = f.vider(envoyer);
		f.ajouter(r('q2', 'B'));
		const v2 = f.vider(envoyer);
		liberer();
		await Promise.all([v1, v2]);
		expect(envoyees).toEqual(['q1', 'q2']);
		expect(f.lister()).toEqual([]);
	});

	test('une réponse ajoutée pendant un envoi n’est pas effacée par cet envoi', async () => {
		const f = creerFile(new StockageMemoire(), 'file-s1');
		f.ajouter(r('q1', 'A'));
		let liberer!: () => void;
		const attente = new Promise<void>((ok) => (liberer = ok));
		const v1 = f.vider(async (x) => {
			if (x.questionId === 'q1') await attente;
			else throw new Error('réseau');
		});
		f.ajouter(r('q2', 'B'));
		liberer();
		await v1;
		expect(f.lister().map((x) => x.questionId)).toEqual(['q2']);
	});

	test('une nouvelle réponse à la même question pendant son envoi est conservée', async () => {
		const f = creerFile(new StockageMemoire(), 'file-s1');
		f.ajouter(r('q1', 'A', '2026-10-18T10:00:00Z'));
		let liberer!: () => void;
		const attente = new Promise<void>((ok) => (liberer = ok));
		const v1 = f.vider(async () => {
			await attente;
			throw new Error('réseau'); // le second envoi n'aura pas lieu dans ce vidage
		});
		f.ajouter(r('q1', 'C', '2026-10-18T10:01:00Z'));
		liberer();
		await v1;
		expect(f.lister()).toEqual([r('q1', 'C', '2026-10-18T10:01:00Z')]);
	});

	test('une réponse refusée définitivement par le serveur est retirée et comptée, la suite continue', async () => {
		const f = creerFile(new StockageMemoire(), 'file-s1');
		['q1', 'q2'].forEach((q) => f.ajouter(r(q, 'A')));
		const bilan = await f.vider(async (x) => {
			if (x.questionId === 'q1') throw new RefusDefinitif('Le temps de l’examen est écoulé.');
		});
		expect(bilan).toEqual({ envoyees: 1, restantes: 0, refusees: 1, messageRefus: 'Le temps de l’examen est écoulé.' });
		expect(f.lister()).toEqual([]);
	});
});
