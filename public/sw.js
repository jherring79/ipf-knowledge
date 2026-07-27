/* IPF Knowledge service worker.
 *
 * Job: make the app open with zero signal. Field guys add it to their home
 * screen; tapping it out at a SWD with no bars has to bring up the capture
 * screen, not a dinosaur.
 *
 * Strategy:
 *   - App pages (/ and /capture): network-first with a short timeout, fall
 *     back to the last good copy in the cache.
 *   - Build assets (/_next/static/*): cache-first -- they are content-hashed,
 *     so a cached copy is never stale.
 *   - Everything else (Supabase API, auth, uploads): straight to the network.
 *     Captures are queued in IndexedDB by the app, not by this worker.
 */

const VERSION = "ipf-knowledge-v1";
const PAGE_CACHE = `pages-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;

const OFFLINE_URL = "/offline.html";

// Pages worth keeping a copy of. These are server-rendered per user, so the
// cached copy is that user's own last-loaded page -- cleared on sign out.
const CACHEABLE_PATHS = ["/", "/capture", "/change-password"];

const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
  "/longhorn-logo.png",
];

const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(ASSET_CACHE)
      .then((cache) =>
        Promise.allSettled(PRECACHE.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== PAGE_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// The app asks us to drop cached pages on sign out, so the next guy to log in
// on a shared phone never sees the previous user's screen.
self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  if (type === "CLEAR_PAGE_CACHE") {
    event.waitUntil(caches.delete(PAGE_CACHE));
  } else if (type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase etc. -- untouched.

  // Hashed build output: cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    PRECACHE.includes(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  const isNavigation =
    request.mode === "navigate" || request.destination === "document";
  const isRsc = request.headers.get("RSC") === "1";

  if ((isNavigation || isRsc) && isCacheablePath(url.pathname)) {
    event.respondWith(pageNetworkFirst(request, isNavigation));
    return;
  }

  // Any other navigation offline still deserves a real page, not a browser error.
  if (isNavigation) {
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await caches.match(request, { ignoreVary: true })) ||
          (await caches.match(OFFLINE_URL)) ||
          Response.error(),
      ),
    );
  }
});

function isCacheablePath(pathname) {
  return CACHEABLE_PATHS.includes(pathname);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;

  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const fallback = await cache.match(request, { ignoreVary: true });
    if (fallback) return fallback;
    throw err;
  }
}

async function pageNetworkFirst(request, isNavigation) {
  const cache = await caches.open(PAGE_CACHE);
  // Key on the request itself; ignoreVary on read keeps a document hit from
  // being missed because Next varies on RSC headers.
  const key = cacheKeyFor(request);

  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response && response.ok) {
      cache.put(key, response.clone());
    }
    return response;
  } catch {
    const hit = await cache.match(key, { ignoreVary: true });
    if (hit) return hit;

    // No cached copy of this page. For a real page load, show the offline
    // page. For an RSC fetch, fail -- Next then falls back to a hard
    // navigation, which we can serve from cache.
    if (isNavigation) {
      const offline = await caches.match(OFFLINE_URL);
      if (offline) return offline;
    }
    return Response.error();
  }
}

// Separate cache entries for the HTML document vs. the RSC payload of the
// same path, so a soft navigation offline gets the right one.
function cacheKeyFor(request) {
  const url = new URL(request.url);
  url.search = "";
  if (request.headers.get("RSC") === "1") {
    url.pathname = `${url.pathname}__rsc`;
  }
  return new Request(url.toString(), { method: "GET" });
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
