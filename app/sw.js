// Arquivo: sw.js | Versão: 1 — Service worker do Task Easier (PWA).
// Estratégia: "rede primeiro" para a própria página (sempre pega a versão
// mais nova quando online) e usa o cache só como reserva offline. Nunca
// intercepta chamadas às APIs do Google nem ao login.
var CACHE = 'task-easier-v1';
var SHELL = ['./', 'index.html', 'gis-shim.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(fetch(req).then(function (resp) {
    var copy = resp.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
    return resp;
  }).catch(function () { return caches.match(req).then(function (m) { return m || caches.match('index.html'); }); }));
});
