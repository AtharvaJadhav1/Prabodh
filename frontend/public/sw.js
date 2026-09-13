/* Prabodh Portal Service Worker
 * App-shell PWA:
 *  - Auth routes (/sign-in /sign-up /login /register /auth): NETWORK ONLY (never cached) — prevents auth loops.
 *  - All other navigations (landing, dashboard, etc.): STALE-WHILE-REVALIDATE — cached shell paints instantly,
 *    network refreshes it in the background. Offline falls back to offline.html.
 *  - Hashed static bundles (_next/static): stale-while-revalidate
 *  - Static assets (images/icons): cache-first with background fill
 *  - API + RSC/prefetch requests: pass-through (never cached)
 */
const SHELL_CACHE = "sih-portal-shell-v2";
const STATIC_CACHE = "sih-portal-static-v2";
const FONT_CACHE = "sih-portal-fonts-v2";
const ACTIVE_CACHES = [SHELL_CACHE, STATIC_CACHE, FONT_CACHE];

const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/icons/pwa/icon-192.png",
  "/icons/pwa/icon-512.png",
];

const AUTH_ROUTES = ["/sign-in", "/sign-up", "/login", "/register", "/auth"];

function isAuthRoute(pathname) {
  return AUTH_ROUTES.some((prefix) => pathname.startsWith(prefix));
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("Network timeout")), ms));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("sih-portal-") && !ACTIVE_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, cacheName, timeoutMs) {
  try {
    const cache = await caches.open(cacheName);
    const res = await Promise.race([fetch(request), timeout(timeoutMs)]);
    if (res && res.ok) {
      const copy = res.clone();
      cache.put(request, copy);
    }
    return res;
  } catch (err) {
    try {
      const cached = await caches.match(request, { cacheName });
      if (cached) return cached;
      if (request.mode === "navigate") {
        const offline = await caches.match("/offline.html", { cacheName: SHELL_CACHE });
        if (offline) return offline;
      }
      return Response.error();
    } catch (fallbackErr) {
      return Response.error();
    }
  }
}

async function staleWhileRevalidateNavigation(request) {
  try {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });
    const network = fetch(request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          cache.put(request, copy);
        }
        return res;
      })
      .catch(() => undefined);
    if (cached) return cached;
    return (await network) || (await cache.match("/offline.html")) || Response.error();
  } catch (err) {
    return Response.error();
  }
}

async function staleWhileRevalidate(request) {
  try {
    const cached = await caches.match(request, { cacheName: STATIC_CACHE });
    const network = fetch(request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() => undefined);
    return (cached || (await network) || Response.error());
  } catch (err) {
    return Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  try {
    const cached = await caches.match(request, { cacheName });
    if (cached) return cached;
    const res = await fetch(request);
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(cacheName).then((cache) => cache.put(request, copy));
    }
    return res;
  } catch (err) {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin: only cache Google Fonts at runtime; everything else passes through (API/backend is cross-origin).
  if (url.origin !== self.location.origin) {
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
      event.respondWith(networkFirst(request, FONT_CACHE, 4000));
    }
    return;
  }

  // Never cache server-component payloads or route prefetches.
  if (request.headers.get("next-router-prefetch") === "1" || request.headers.get("rsc") === "1") {
    event.respondWith(fetch(request));
    return;
  }

  // Navigations: auth routes stay network-only; everything else paints from the cached shell instantly (SWR).
  if (request.mode === "navigate") {
    if (isAuthRoute(url.pathname)) {
      event.respondWith(fetch(request));
      return;
    }
    event.respondWith(staleWhileRevalidateNavigation(request));
    return;
  }

  // Same-origin static assets.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/offline.html" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    if (url.pathname.startsWith("/_next/static/")) {
      // Hashed, immutable filenames — serve cache instantly, refresh in background.
      event.respondWith(staleWhileRevalidate(request));
    } else {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
    }
    return;
  }

  event.respondWith(fetch(request));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});