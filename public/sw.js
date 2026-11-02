// Service worker minimo: serve solo a rendere l'app "installabile" (PWA).
// Non fa cache: tutte le richieste passano normalmente dalla rete,
// così ogni deploy arriva subito agli utenti senza versioni vecchie.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => { /* passthrough: nessuna cache */ })
