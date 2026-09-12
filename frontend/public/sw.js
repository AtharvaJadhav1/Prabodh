/* Prabodh — SIH 2026 Portal Service Worker
 * App-shell PWA:
 *  - Auth routes (/sign-in /sign-up /login /register /auth): NETWORK ONLY (never cached) — prevents auth loops.
 *  - All other navigations (landing, dashboard, etc.): NETWORK-FIRST (4s) -> shell cache -> offline.html
 *  - Hashed static bundles (_next/static): stale-while-revalidate
 *  - Static assets (images/icons): cache-first with background fill
 *  - API + RSC/prefetch requests: pass-through (never cached)
 */
const SHELL_CACHE = "sih-portal-shell-v1";
const STATIC_CACHE = "sih-portal-static-v1";
const FONT_CACHE = "sih-portal-fonts-v1";
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
  const cache = await caches.open(cacheName);
  try {
    const res = await Promise.race([fetch(request), timeout(timeoutMs)]);
    if (res && res.ok) {
      const copy = res.clone();
      cache.put(request, copy);
    }
    return res;
  } catch (err) {
    const cached = await caches.match(request, { cacheName });
    if (cached) return cached;
    if (request.mode === "navigate") {
      return caches.match("/offline.html", { cacheName: SHELL_CACHE });
    }
    return cached;
  }
}

async function staleWhileRevalidate(request) {
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
  return cached || network;
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(cacheName).then((cache) => cache.put(request, copy));
  }
  return res;
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

  // Navigations: auth routes stay network-only; everything else is network-first with offline fallback.
  if (request.mode === "navigate") {
    if (isAuthRoute(url.pathname)) {
      event.respondWith(fetch(request));
      return;
    }
    event.respondWith(networkFirst(request, SHELL_CACHE, 4000));
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