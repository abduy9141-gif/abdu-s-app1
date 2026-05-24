// ════════════════════════════════════════════════
// የአብዱ አፕ — Service Worker v3
// ════════════════════════════════════════════════

const CACHE_NAME = 'abdu-app-v3';

// ሁሉም ካሽ የሚደረጉ ፋይሎች
const ASSETS = [
  './index.html',
  './manifest.json',
  './sw.js',
  // Google Fonts — ኦፍላይን ለማድረግ cache እናደርጋቸዋለን
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;600;700;900&family=DM+Mono:wght@400;500&display=swap'
];

// ══ INSTALL ══════════════════════════════════════
self.addEventListener('install', event => {
  console.log('[SW] Installing v3...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // ዋና ፋይሎች (must cache)
        return cache.addAll([
          './index.html',
          './manifest.json'
        ]).then(() => {
          // Google Fonts (optional — ካልተሳካ ማለፍ)
          return cache.add(
            'https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;600;700;900&family=DM+Mono:wght@400;500&display=swap'
          ).catch(() => console.log('[SW] Fonts not cached — will try later'));
        });
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
  );
});

// ══ ACTIVATE ═════════════════════════════════════
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => {
        console.log('[SW] Activated');
        return self.clients.claim();
      })
  );
});

// ══ FETCH — Cache First + Network Fallback ════════
self.addEventListener('fetch', event => {
  // POST requests — skip
  if (event.request.method !== 'GET') return;

  // Chrome extensions — skip
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {

        // ✅ Cache hit — ወዲያው ስጥ
        if (cachedResponse) {
          // Background update (Stale-While-Revalidate)
          const fetchPromise = fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, clone));
              }
              return networkResponse;
            })
            .catch(() => {}); // silent fail
          
          return cachedResponse;
        }

        // ❌ Cache miss — Network ሞክር
        return fetch(event.request)
          .then(networkResponse => {
            // Valid response — cache አድርግ
            if (networkResponse && 
                networkResponse.status === 200 && 
                networkResponse.type !== 'opaque') {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            // ሁሉም ሞከረ — Offline fallback
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            // Google Fonts fallback — system font
            if (event.request.url.includes('fonts.googleapis') || 
                event.request.url.includes('fonts.gstatic')) {
              return new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } });
            }
            return new Response('Offline', { 
              status: 503, 
              headers: { 'Content-Type': 'text/plain' } 
            });
          });
      })
  );
});

// ══ MESSAGE ══════════════════════════════════════
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// ══ BACKGROUND SYNC (ለወደፊት) ═════════════════════
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('[SW] Background sync triggered');
  }
});

console.log('[SW] Service Worker loaded — የአብዱ አፕ v3');
