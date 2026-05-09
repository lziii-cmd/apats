const CACHE_NAME = "apats-v1";

// Assets statiques à mettre en cache immédiatement
const PRECACHE_URLS = ["/offline.html", "/manifest.json", "/icons/icon-192.svg", "/icons/icon-512.svg"];

// Préfixes de routes API à ne JAMAIS mettre en cache (données sensibles ou temps-réel)
const NO_CACHE_API_PREFIXES = [
  "/api/auth",
  "/api/cotisations",
  "/api/tresorerie",
  "/api/admin",
  "/api/me/password",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et cross-origin
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Ne jamais mettre en cache les routes API sensibles
  const isNoCacheApi = NO_CACHE_API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  if (isNoCacheApi) return;

  // Routes API non-sensibles (annonces, réunions, membres, notifications) : network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Assets statiques (_next/static) : cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached ?? fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Pages navigables : network-first avec fallback offline
  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match("/offline.html")))
  );
});
