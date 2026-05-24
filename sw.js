// ════════════════════════════════════════════════
// የአብዱ አፕ — Service Worker v4
// ════════════════════════════════════════════════

const CACHE = 'abdu-v4';

// ── INSTALL ──────────────────────────────────────
self.addEventListener('install', e => {
  console.log('[SW] Install');
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // index.html ብቻ በእርግጠኝነት cache እናደርጋለን
      return cache.addAll([
        './',
        './index.html',
        './manifest.json',
        './sw.js'
      ]).catch(err => {
        console.log('[SW] Cache addAll error (ignored):', err);
      });
    })
  );
});

// ── ACTIVATE ─────────────────────────────────────
self.addEventListener('activate', e => {
  console.log('[SW] Activate');
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE)
          .map(k => {
            console.log('[SW] Delete old cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — Network First, Cache Fallback ─────────
self.addEventListener('fetch', e => {
  // GET requests ብቻ
  if (e.request.method !== 'GET') return;
  // chrome-extension skip
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Network ሰራ → cache አድርግና ስጥ
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Network አልሰራም → Cache ሞክር
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // index.html fallback ለሁሉም document requests
          if (e.request.destination === 'document') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// ── MESSAGE ──────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] የአብዱ አፕ Service Worker v4 loaded');
