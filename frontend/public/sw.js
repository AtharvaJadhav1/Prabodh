const CACHE_VERSION = "sih-portal-v3";
const PRECACHE_URLS = [];

function isAuthOrAppShell(pathname) {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => (PRECACHE_URLS.length ? cache.addAll(PRECACHE_URLS) : undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache auth / dashboard navigations — stale SW caused login loops.
  if (request.mode === "navigate" || isAuthOrAppShell(url.pathname)) {
    event.respondWith(fetch(request));
    return;
  }

  if (url.origin !== self.location.origin) {
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
      event.respondWith(
        caches.match(request).then(
          (cached) =>
            cached ||
            fetch(request)
              .then((response) => {
                if (!response || response.status !== 200) return response;
                const copy = response.clone();
                caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
                return response;
              })
              .catch(() => cached)
        )
      );
    }
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/icon.ico"
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
