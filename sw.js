// Montse's Flow · funciona sin internet y se actualiza sola.
// 1) Al instalarse guarda una copia de la app (si algún archivo falla, guarda los demás).
// 2) Al abrir: intenta la versión nueva, pero si la red no responde en 3 s usa la copia guardada.
const CACHE = 'mf-v3';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-192-v2.png', './icons/icon-512.png', './icons/apple-touch-icon-v2.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, {cache: 'reload'})).catch(() => null)))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function savedPage() {
  return caches.open(CACHE).then(c => c.match('./index.html').then(r => r || c.match('./', {ignoreSearch: true})));
}
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // nube, IA, etc. van directo
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isPage) {
    const fresh = fetch(req, {cache: 'no-store'}).then(r => {
      if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); }
      return r;
    });
    e.waitUntil(fresh.catch(() => null));
    const timeout = new Promise(res => setTimeout(res, 3000)).then(savedPage);
    e.respondWith(Promise.race([fresh.catch(() => savedPage()), timeout]).then(r => r || fresh));
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(r => r || fetch(req).then(res => {
    if (res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return res;
  })));
});
