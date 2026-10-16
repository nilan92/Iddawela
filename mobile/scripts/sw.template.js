const V = 'idw-__VERSION__';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  const immutable = u.pathname.startsWith('/_expo/') || u.pathname.startsWith('/fonts/') || u.pathname.startsWith('/assets/');
  const media = u.pathname.startsWith('/media/') || u.pathname.startsWith('/icons/') || u.pathname.startsWith('/og/');
  if (immutable || media) {
    e.respondWith(caches.open(V).then(async (c) => { const hit = await c.match(e.request); if (hit) return hit;
      const res = await fetch(e.request); if (res.ok && (immutable || res.headers.get('cache-control')?.includes('public'))) c.put(e.request, res.clone()); return res; }));
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((res) => { const cp = res.clone(); caches.open(V).then((c) => c.put(e.request, cp)); return res; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
  }
});
