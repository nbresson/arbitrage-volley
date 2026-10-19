import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { creerComptesDeTest, type ComptesDeTest } from './aide-comptes';
import { admin, unique } from './client';

let c: ComptesDeTest;
const crees: string[] = [];

beforeAll(async () => {
	c = await creerComptesDeTest();
}, 60000);

afterAll(async () => {
	for (const id of crees) await admin.auth.admin.deleteUser(id);
	await c.nettoyer();
});

// envoyer_email: false → le lien d'invitation est renvoyé au lieu d'être envoyé (pas d'e-mail réel pendant les tests).
const corps = (email: string, extra: Record<string, unknown> = {}) => ({
	email,
	prenom: 'Camille',
	nom: 'Test',
	role: 'stagiaire',
	profil_formation: 'marqueur',
	niveau_id: null,
	mineur_parents_informes: true,
	envoyer_email: false,
	...extra
});

const statut = async (r: { error: unknown }) => ((r.error as { context?: Response } | null)?.context?.status ?? 201);

describe('fonction creer-compte', () => {
	test('un stagiaire est refusé (403)', async () => {
		const r = await c.stagiaireA.functions.invoke('creer-compte', { body: corps(`refus-${unique()}@test.invalid`) });
		expect(await statut(r)).toBe(403);
	});

	test('un formateur crée le compte et le profil (201)', async () => {
		const email = `nouveau-${unique()}@test.invalid`;
		const r = await c.formateur.functions.invoke('creer-compte', { body: corps(email) });
		expect(r.error).toBeNull();
		expect(r.data.id).toBeTruthy();
		expect(r.data.lien).toMatch(/^https?:\/\//);
		crees.push(r.data.id);
		const { data: p } = await admin.from('profils').select('prenom, nom, email, role, profil_formation, mineur_parents_informes, actif').eq('id', r.data.id).single();
		expect(p).toEqual({ prenom: 'Camille', nom: 'Test', email, role: 'stagiaire', profil_formation: 'marqueur', mineur_parents_informes: true, actif: true });
	});

	test('la même adresse deux fois : 409 avec un message clair', async () => {
		const email = `double-${unique()}@test.invalid`;
		const r1 = await c.formateur.functions.invoke('creer-compte', { body: corps(email) });
		crees.push(r1.data.id);
		const r2 = await c.formateur.functions.invoke('creer-compte', { body: corps(email) });
		expect(await statut(r2)).toBe(409);
		expect(await (r2.error as { context: Response }).context.json()).toEqual({ message: 'Un compte existe déjà avec cette adresse.' });
		// le compte existant n'a pas été supprimé au passage
		const { data } = await admin.auth.admin.getUserById(r1.data.id);
		expect(data.user?.id).toBe(r1.data.id);
		expect((await admin.from('profils').select('id').eq('id', r1.data.id)).data).toHaveLength(1);
	});

	test('adresse d’un compte d’authentification sans profil : jamais supprimé', async () => {
		const email = `orphelin-${unique()}@test.invalid`;
		const { data: u } = await admin.auth.admin.createUser({ email, password: `Mdp-${unique()}-9`, email_confirm: true });
		crees.push(u.user!.id);
		await admin.from('profils').insert({ id: u.user!.id, prenom: 'Déjà', nom: 'Là' });
		const r = await c.formateur.functions.invoke('creer-compte', { body: corps(email) });
		expect(await statut(r)).toBe(409);
		expect((await admin.auth.admin.getUserById(u.user!.id)).data.user?.id).toBe(u.user!.id);
	});

	test('information des parents non renseignée : 422', async () => {
		const r = await c.formateur.functions.invoke('creer-compte', { body: corps(`sans-${unique()}@test.invalid`, { mineur_parents_informes: undefined }) });
		expect(await statut(r)).toBe(422);
	});

	test('sans session : 401', async () => {
		const res = await fetch(`${process.env.SUPABASE_TEST_URL}/functions/v1/creer-compte`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', apikey: process.env.SUPABASE_TEST_ANON_KEY! },
			body: JSON.stringify(corps(`anon-${unique()}@test.invalid`))
		});
		expect(res.status).toBe(401);
	});
});
