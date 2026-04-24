const CACHE_NAME = "rongoe-v4";
const ASSETS = [
  "/rongoe/",
  "/rongoe/index.html",
  "/rongoe/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCompetitionFeed = isSameOrigin && url.pathname.endsWith("/competition-live.json");
  const isNavigation = req.mode === "navigate";

  // Always try network first for dynamic competition data.
  if (isCompetitionFeed) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Network first for document navigation so new deployments show up quickly.
  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match("/rongoe/index.html"))
    );
    return;
  }

  // Cache first for static assets.
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
