/* Lumen — offline cache.
   Cache-first so the game opens instantly and plays with no connection at all;
   every fetch quietly refreshes its entry in the background, so a redeploy
   reaches players on their next launch. CACHE is stamped at package time. */
var CACHE = 'lumen-v1';

var PRECACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/storage.js',
  './js/audio.js',
  './js/engine.js',
  './js/game.js',
  './js/install.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(function (hit) {
      var live = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // offline: fall back to the shell for page navigations
        return hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined);
      });
      return hit || live;
    })
  );
});
