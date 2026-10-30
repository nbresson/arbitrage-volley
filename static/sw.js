// Service worker : application installable, et règles consultées lisibles sans réseau.
// - Fichiers de l'application (/_app/immutable : noms uniques) : cache d'abord.
// - Pages : réseau d'abord, page d'accueil en cache si le réseau manque (le site est une application d'une page).
// - Contenu des règles (règles, éditions, glossaire, figures) : réseau d'abord, dernière version en cache sinon.
//   Aucune donnée personnelle (séances, réponses, profils) n'est mise en cache.
const CACHE = 'arbitrage-volley-v1';
const CONTENU_REGLES = /\/rest\/v1\/(regles|editions|glossaire|figures)(\?|$)/;

self.addEventListener('install', (e) => {
	e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icone.svg'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
	e.waitUntil(
		caches
			.keys()
			.then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
			.then(() => self.clients.claim())
	);
});

async function reseauDabord(requete, secours) {
	const cache = await caches.open(CACHE);
	try {
		const reponse = await fetch(requete);
		if (reponse.ok) cache.put(requete, reponse.clone());
		return reponse;
	} catch (err) {
		const enCache = (await cache.match(requete)) || (secours && (await cache.match(secours)));
		if (enCache) return enCache;
		throw err;
	}
}

async function cacheDabord(requete) {
	const cache = await caches.open(CACHE);
	const enCache = await cache.match(requete);
	if (enCache) return enCache;
	const reponse = await fetch(requete);
	if (reponse.ok) cache.put(requete, reponse.clone());
	return reponse;
}

self.addEventListener('fetch', (e) => {
	const r = e.request;
	if (r.method !== 'GET') return;
	const url = new URL(r.url);
	if (url.origin === self.location.origin) {
		if (r.mode === 'navigate') return e.respondWith(reseauDabord(r, '/'));
		if (url.pathname.startsWith('/_app/immutable/')) return e.respondWith(cacheDabord(r));
		return e.respondWith(reseauDabord(r));
	}
	if (CONTENU_REGLES.test(url.pathname + url.search)) e.respondWith(reseauDabord(r));
});
